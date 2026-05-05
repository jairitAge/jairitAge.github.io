## 这篇文章在解决什么问题

LLM-based 多智能体（multi-agent）workflow 的一个典型形态是：一组角色固定、prompt 固定的 agent 按某种调度依次（或并发）调用同一个底层 LLM 服务。每个 agent 都带有相对长且固定的 system prompt / persona prompt，**在被反复触发的过程中，这部分前缀的 KV 是高度可复用的**。现代推理系统（vLLM、SGLang 等）已经普遍用 **prefix caching / radix cache** 来跨调用复用 KV，从而省掉重复 prefill 的算力。

但作者注意到一个 mismatch：

- **缓存淘汰策略默认是 LRU**——只看「上一次什么时候用过」。
- **多智能体 workflow 是有结构的**——下一步要执行哪个 agent，往往可以从 workflow 图上看出来。

论文里的例子很直白：`Planner → Executor → Expresser → Reviewer` 循环执行。在 Executor 刚跑完的那一时刻，Expresser 是上一轮里最早被访问的，按 LRU 它「最久没用」会被踢掉；但下一步要跑的恰恰就是 Expresser，于是必然 cache miss，要重新 prefill 它那一大段固定 prompt——**淘汰决策和真实复用模式背离**。

## 为什么 LRU 之前一直没被换掉

LRU 不是没道理。它的根基是**时间局部性**假设：最近用过的，近期还会再被用。这个规律在 CPU cache、OS page cache、DB buffer pool 几乎处处成立。

它在 LLM serving 里的合理场景是**单 agent / 多用户并发**：

- 用户 A 问邮件、用户 B 问量子计算、用户 C 翻译……
- 访问模式随机、用户间相互独立；
- 「最久没用」的请求基本上后面也不会用——LRU 是好策略。

但多 agent 循环 workflow 把局部性反过来了：

| 假设 | 单 agent 并发 | 多 agent workflow |
|---|---|---|
| 访问模式 | 随机、不可预测 | 周期性循环、高度可预测 |
| 「最久没用」 | 大概率近期也不会用 | **可能恰恰是下一个要用的** |
| 时间局部性 | ✅ 成立 | ❌ 不成立（甚至反过来） |

加上多 agent workflow 是 2023 年才随 MetaGPT 流行起来的范式，而且 GPU 内存够大时 LRU 的缺陷根本不会暴露——所以 KVFlow 之前的 cache 管理几乎都默认沿用 LRU，是历史路径而不是设计盲区。

## KVFlow 的核心做法

### 1. Agent Step Graph

把 workflow 抽象成图：节点是 agent 调用，边代表执行依赖 / 调度顺序。基于当前调度状态，给每个 agent 算一个 **steps-to-execution（STE）**——它距离下一次激活还有几步。STE 越小，KV 越值得保留。

对带分支或同步屏障的情况：

- **OR 结构**（`Executor1` 或 `Executor2` 完成即可）：取 `min`；
- **AND 结构**（必须全部完成才继续）：取 `max`。

例如 `Planner(0) → Executor1(1), Executor2(2) → Expresser(max(1,2)+1 = 3)`，Expresser 拿到正确的 3，不会被提前踢掉。

### 2. 节点级、细粒度的淘汰

prefix cache 是 **radix tree**，多个 agent prompt 之间存在共享前缀。KVFlow 不是给整段 prompt 打一个分，而是把 STE 下沉到树上每个节点：

- **共享节点取最保守值**：只要还有一个即将运行的 agent 依赖这个公共前缀，它就不能被踢；
- **私有后缀按各自 agent 的 STE**；
- **动态后缀**（每次都不同的内容）几乎不可能被复用，最先驱逐。

### 3. 全异步的 CPU→GPU 预取 + 状态感知调度

对于「下一步要用、当前不在 GPU」的 KV，KVFlow 在后台线程**主动从 CPU prefetch 到 GPU**。这部分搬运和当前 step 的 forward / 解码是 overlap 的：

- GPU 计算用算力 + GPU→CPU 出 token；
- 预取用 PCIe 的 CPU→GPU 方向。
- PCIe 全双工，两者互不干扰。

KV 节点引入四态状态机（`In GPU` / `Backup in CPU` / `Loading` / `Offloading`）。调度器在挑下一个要跑的请求时，发现某节点还在 `Loading`，就先跳过去跑别的已就绪请求，等数据搬完再回来——**避免「选中→等 PCIe→GPU 空转」的流水线断裂**。

## 报告效果

相比 SGLang hierarchical radix cache：

- 4096-token 固定前缀单 workflow：**1.42×**；
- 8192-token 固定前缀单 workflow：**1.83×**（最大）；
- 20–128 个并发 workflow：**最高 2.19×**。

固定前缀越长、并发越高，相对收益越大——KV 容量压力越大，淘汰决策的好坏越敏感。

## 一个反直觉的实验：HiCache 在高并发下反而更慢

论文里一个很有意思的对照：HiCache 在 64 并发场景下相对纯 GPU SGLang 只有 **0.57×**——多了一层 CPU 备份反而比直接重算更慢。这一点我和 Claude 来回讨论了好几轮，把直觉拧正了一下。

**第一直觉（错误的）**：64 个并发加载会把 PCIe 带宽切成 1/64，每个请求等待时间膨胀 60 倍。

**为什么这是错的**：PCIe 支持多路并发 DMA，64 个传输可以**同时进行**，并不是排队串行。带宽不是被切割成 64 份，每路只能拿到 1/64。

**真正的瓶颈**：

```
GPU 重算的扩展性：
  1 个 agent → 50ms
  64 个 agent batch 一起算 → ~80ms（几乎不增加）
  原因：GPU 几万个核心，batch 越大利用率越高，几乎免费

PCIe 加载的扩展性：
  1 个 agent 传 256MB → 4ms
  64 个 agent 一起传共 16GB → 16GB / 64GB/s = 250ms
  原因：带宽是固定物理上限，数据量线性涨，时间线性涨
```

**两个隐藏的二阶效应让差距更大**：

1. **Reactive Loading 让 GPU 空转**：HiCache 是「请求被调度才开始 load」，所以那 250ms 里 GPU 没活干，纯空转；KVFlow 的预取是 proactive 的，在前一个 step 计算时就开始搬了。
2. **打乱了 SGLang 的 continuous batching 流水线**：调度器原本假设「选中即可立刻执行」，HiCache 在中间插了一段不可预测的等待，调度器没法用它来填充别的有用工作。

整理成对照表：

| | 纯 GPU SGLang（重算） | HiCache（加载） |
|---|---|---|
| 资源消耗 | GPU 算力 | PCIe 带宽 |
| 是否可 batch | ✅ GPU 并行 | ❌ 总带宽固定，并发下数据量线性涨 |
| 低并发 | 慢（50ms） | 快（4ms） |
| 高并发 | 仍快（batch 后 ~80ms） | 极慢（~250ms + GPU 空转） |

**这才是 KVFlow 加 proactive prefetch 的根本原因**——光备份到 CPU 不够，必须把搬运和 GPU 计算 overlap 起来；并且高并发下还要靠状态感知调度避免「明明 KV 还在 loading 就硬凑 batch」。

## 用 Survey 的 L / A / C 框架定位 KVFlow

> 这部分用 ColAgent / Survey Report 里的分类体系（L0–L4 层次、A1–A4 轴、C1–C4 类）做定位。

**L-scope（KVFlow 自己的层次）**：

- KVFlow 是 **L4（Serving Infrastructure）层**的工作；
- 但它**向上越过 L0 / L1 边界**抓语义信号——Agent Step Graph 本质是把 L0/L1 的 coordination state 暴露给 L4 cache 管理；
- 这正对应 Survey 里指出的「今天的引擎所缺少的 coordination-state 感知组件」的原型实现。

**C-class（KVFlow 服务的上层应用）**：

- 主要目标是 **C4（Ledger-driven dispatch）**：Magentic-One 风格、Orchestrator 每步选一个 agent 激活——这种结构对 STE 的预测最有效；
- 部分覆盖 **C1（Synchronous fan-out）**：用 `max` 聚合处理 AND 同步屏障；但 C1 真正棘手的「Spawn Burst」并不是 KVFlow 的核心目标；
- **C2（事件驱动异步）**几乎不适用：未来激活时间不确定，STE 没法估计；
- **C3（顺序角色流水线）** 论文实验没专门测，但理论上比 C4 还容易处理。

**A-axes（不适合直接用来分类 KVFlow）**：

- A1–A4 描述的是 Orchestrator 的设计选择（应用层），KVFlow 是服务系统不是 Orchestrator；
- 但 A2（派生模式）/ A3（共享状态）反过来决定了 **KVFlow 能从上层拿到多少有用信息**——共享 prompt 越多、派生越规整，KVFlow 收益越大。

一句话：**KVFlow = L4 infra × C4 主战场（兼 C1 部分） × 利用 L0/L1 语义反哺 L4 决策**。

## 我的想法

> 这篇文章本身不复杂，但它代表了一个我很喜欢的范式：**把上层语义信号（这里是 workflow 调度）暴露给下层资源管理（这里是 KV cache）**。整个工作几乎一句话能讲清——「LRU 换成调度感知的 STE」——但拿到的加速倍数说明这条裂缝以前一直没被认真填上。

几个延伸思考：

- **STE 的预测精度 vs. 调度动态性**：在确定性 workflow 里 STE 是精确值；但在 router / planner agent 由 LLM 输出下一步的场景里，STE 只能是预测值。错预测的代价多大？是不是该上一个类似分支预测器的东西？
- **和 disaggregated / hierarchical KV 的关系**：KV 现在普遍分层放在 GPU HBM、CPU DRAM、NVMe、远端节点。KVFlow 的预取本质上是在 hierarchy 上做软件流水。如果再叠一层 [Mooncake](https://arxiv.org/abs/2407.00079) 这种 disaggregated KV pool，调度感知能不能继续吃到收益？
- **硬件层面的可借鉴点**：从体系结构角度，这其实是把 cache 替换策略从 LRU 升到 **lookahead / hint-based prefetcher**。如果做芯片侧 KV controller（哪怕是 HBM/CXL 控制器），调度图可以走专门的指令通道作为 hint 下发——这是一个具体的「系统/硬件协同」抓手。
- **能不能扩展到非 agent 场景**：RAG / 长 context 检索增强里也有「哪些前缀块未来更可能复用」的判断。如果有访问历史 + 任务结构，类似思路应该可以泛化，只是 STE 的来源不再是显式调度图，而是一个学到的预测器。
- **HiCache 实验的方法论价值**：论文真正聪明的地方是它把 HiCache 作为 baseline——这逼着读者直面「为什么加一层 CPU 缓存反而更慢」。**没有 proactive prefetch + status-aware scheduling 的分层缓存是一个陷阱**，这个 negative result 比加速倍数本身更值得收藏。

## 一句话总结

> **LRU 的失败不是它太慢，而是它「不认识」工作流。把调度图当作 cache 的语义提示，是这篇文章最干净的贡献。**
