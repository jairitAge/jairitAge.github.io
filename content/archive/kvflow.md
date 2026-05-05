## 在解决什么问题

多 agent workflow 现在很多是这种形态：一组角色固定、prompt 也固定的 agent，按某种调度依次（或并发）调一个 LLM 服务。每个 agent 那段长 prompt 是反复用的，所以推理系统普遍上 prefix cache（vLLM、SGLang 都是 radix tree）来跨调用复用 KV，省掉重复 prefill。

但 cache 满了要淘汰一些条目，默认策略是 LRU——只看「上一次什么时候用过」。问题是，多 agent workflow 的执行顺序常常是可以预测的，下一步要跑谁基本就摆在那里。于是 LRU 在这里会做出明显错误的决定：

论文那个例子很直观，`Planner → Executor → Expresser → Reviewer` 循环。Executor 刚跑完那一刻，Expresser 是这一轮里最早被访问的，按 LRU 它「最久没用」会被淘汰；但下一步要跑的恰恰是 Expresser，结果必然 miss，又得重新 prefill 一大段固定 prompt。

## 那为什么之前一直用 LRU

我之前其实有点想不通这个，问了一下才理顺：LRU 不是没道理，它的根基是时间局部性——最近用过的近期还会再用。这个假设在 CPU cache、OS、DB 缓冲池里都成立。

它在 LLM serving 里的合适场景是**单 agent 多用户并发**那种：用户 A 写邮件、B 问量子、C 翻译……用户之间相互独立、访问随机，「最久没用」的请求大概率后面也用不到，LRU 是好策略。

但多 agent 循环 workflow 把这个假设反过来了：「最久没用」反而可能是「下一个就要用」。再加上多 agent 这种范式真正流行起来其实就这一两年（MetaGPT 大概 2023 年），更早的时候没这个用例；而且只要 GPU 内存够大，所有 KV 都能常驻，LRU 的缺陷根本看不出来——所以一直没人换。算是历史路径，不是设计盲区。

## 怎么做的

三件事，听起来很复杂，本质都不难。

**Agent Step Graph + steps-to-execution（STE）**。把 workflow 抽成图，每个 agent 算一个数值——它距离下次激活还有几步。STE 越小越值得留下。带分支的话：OR（哪个先完都行）取 min，AND（必须都完成）取 max。

**节点级的淘汰**。prefix cache 是 radix tree，多个 agent 之间会共享前缀。KVFlow 不是给整段 prompt 打一个分，而是把 STE 下沉到树上每个节点。共享节点取最保守的值（只要还有一个 agent 即将用就不能淘汰）；私有后缀按各自的 STE 走；每次都不一样的动态后缀几乎用不上，最先淘汰。

**全异步 prefetch + 状态感知调度**。下一步要用、当前不在 GPU 的 KV，后台线程提前从 CPU 搬上去。GPU 算 forward 用的是算力 + GPU→CPU 的输出 token 通道，prefetch 用的是 CPU→GPU 方向，PCIe 全双工互不干扰。每个 KV 节点有四态（在 GPU / CPU 备份 / loading / offloading），调度器看到要用的节点还在 loading 就先跳过这个请求，去跑别的已就绪的——避免「选中→等 PCIe→GPU 空转」这种流水线断裂。

## 效果

相对 SGLang 的 hierarchical radix cache：
- 单 workflow，4096 token 固定前缀：1.42×
- 单 workflow，8192 token 固定前缀：1.83×
- 20–128 个并发 workflow：最多 2.19×

固定前缀越长、并发越多，相对收益越大——其实就是 KV 容量压力越大、淘汰策略越敏感。

## 那个 HiCache 反而更慢的实验

论文里有个挺反直觉的对照：HiCache 在高并发（64 个 workflow）下相对纯 GPU SGLang 只有 0.57×。多了一层 CPU 备份反而比直接重算还慢。这个我和 Claude 来回辩了好几轮，中间我自己的直觉也错过一次，最后才算想明白。

我一开始以为是 PCIe 带宽被切了。64 个加载请求一起来，每个分到 1/64 的带宽，所以单个传输时间从 4ms 涨到 256ms。但这其实是错的——PCIe 是支持多路并发 DMA 的，64 个传输可以同时进行，并不是排队串行。带宽本身没被切。

真正的瓶颈是另外一回事：**总数据量随并发线性涨，但 PCIe 的总带宽是物理上限**。64 个 agent 一共要搬 16GB，PCIe 64GB/s，最快也要 250ms 才搬得完。GPU 这边，64 个 agent batch 一起算大概 80ms（因为 GPU 并行度极高，batch 几乎免费）。所以这个时候反而不如直接重算。

GPU 的可扩展性远好于 PCIe。低并发的时候加载比重算快，高并发反过来——一个能 batch 一个不能 batch，这才是关键。

再加上两个二阶效应让差距更大：
- HiCache 是 reactive 的，请求被调度才开始 load，那 250ms 里 GPU 空转；
- 这种不可预测的等待打乱了 SGLang continuous batching 的节奏，调度器原本假设「选中即可立刻执行」，HiCache 在中间插一段不知道多长的等待，调度器没法用它来填别的有用工作。

KVFlow 的 proactive prefetch + 状态感知调度，正好把这两点都解决了。所以光备份到 CPU 是不够的，搬运必须和 GPU 计算 overlap。

我觉得论文最聪明的地方其实不是它的加速比，而是它把 HiCache 拿来当 baseline——这逼着读者直面「为什么加一层 CPU 缓存反而更慢」。这个 negative result 比 1.83× / 2.19× 那两个数字记得更牢。

## 学到了什么

- **「时间局部性」这个假设是有前提的**。它在用户独立的并发场景里成立，但在循环 workflow 里会反过来。LRU 不是慢，是用错了模型——这件事比 KVFlow 这一篇本身的加速比更值得记住。
- **把上层语义信号暴露给下层资源管理是个好范式**。这篇文章本质就是一句话：「LRU 换成调度感知的 STE」。但拿到的加速倍数说明这条裂缝以前一直没被认真填上。这种「跨层」的优化以后应该还会反复出现。

## 几个开放问题

- **STE 的预测精度问题**。在确定性 workflow 里 STE 是精确值，但下一步执行哪个 agent 由 LLM 自己决定（router / planner）的场景里，STE 只能是预测值。错预测的代价是多大？要不要做一个类似分支预测器的机制？这是这套方法走出 demo 场景之后会先碰到的问题。
- **硬件上能不能落地**。从体系结构角度，这其实就是把 cache 替换从 LRU 换成 lookahead / hint-based prefetcher——CPU 那边早就这么干了。如果做芯片侧的 KV controller（HBM 控制器、CXL 之类的），调度图作为 hint 走专门指令通道下发，是一个具体的「系统/硬件协同」抓手。怎么落地我还没想透。
