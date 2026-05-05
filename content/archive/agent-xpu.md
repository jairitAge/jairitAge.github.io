## 在解决什么问题

LLM Agent 越来越多地被塞到个人设备上跑——手机、笔电这类。这类场景同时存在两种很不一样的任务：

- **reactive**：用户主动发起的请求，比如「帮我回这封邮件」，**要低延迟**，人在等结果；
- **proactive**：Agent 在后台持续监控环境，比如自动扫一遍新邮件、根据日程提示设闹钟，**要高吞吐**，每个任务慢一点没关系，但量很大。

而它们都要跑在同一块 SoC 上。SoC 集成了三种计算单元：CPU（控制流）、NPU（神经网络加速器，能效比极高但灵活性差）、iGPU（集成显卡，灵活但能耗高）。这套硬件配置和云端「一堆离散 GPU + 单租户」的世界完全不同。

## 三种计算单元的特性

这部分我之前不太分得清，记一下：

- **NPU**：核心是一个固定的 **MAC 阵列**（乘加单元矩阵）。数据流路径是**编译时就固定**的——切块怎么切、scratchpad 怎么放、DMA 什么时候搬下一块，全都按预先算好的节拍走。能效极高，但**只能跑预先编译好的固定形状**，换形状必须重新编译。
- **iGPU**：本质上就是 GPU，集成在芯片里和 CPU、NPU 共享 DDR。计算模型是 **SIMT**（单指令多线程），有大量独立的执行单元（EU），每个 EU 是一个能跑完整程序的小处理器。所以**它天生支持动态形状**——M=188 还是 M=700，无非启动多少个线程的事，控制流在硬件层面是一等公民。
- **CPU**：管控制、跑编译器、跑调度逻辑。所有给 NPU 和 iGPU 的指令都是 CPU 编出来的。

这套差异决定了后面所有设计。

## 三个挑战

1. **NPU 不能 JIT**。LLM 的输入长度千变万化，但 NPU 必须 AOT 提前编译好固定形状的内核。运行时临时编译一个新形状代价是秒级，等于阻塞推理。
2. **共享 DDR 带宽争用**。NPU 和 iGPU 共享同一块 DDR 内存，没有独立显存。论文实测：内存密集型的 GEMV（decode 主算子）在两边同时跑时延迟大幅上涨；计算密集型的 GEMM（prefill 主算子）则相对不受影响。
3. **没有 stream-aware 的运行时抽象**。现有引擎对 reactive / proactive 一视同仁，后台任务会拖慢前台交互。

## 怎么做的

三件事，听起来很复杂，本质都是「按硬件特性精准分工」。

**HEG（Hybrid Execution Graph）**。把每一层 Transformer 的算子按特性切开：
- **token-wise** 算子（QKV 投影、FFN 等，每个 token 独立计算）→ 按 chunk_size=256 切成固定大小的小块，喂给 NPU 跑预编译好的静态内核；不能整除剩下的「余量」（比如 700 token 切完剩 188）→ 交给 iGPU。
- **sequence-wise** 算子（MHA 注意力，需要看整个序列）→ 形状随序列长度变，必须 iGPU。

**Stage Elasticity**：阶段级的协同。Prefill（计算密集、形状相对固定）默认走 NPU；decode（每次生成一个 token、batch 动态变化）默认走 iGPU。这样从根本上避开 GEMV 同时跑两边带宽抢爆的情况。来了一个 reactive 急活，再做弹性张量并行——decode 空闲就把 prefill 的 chunk 同时分给 NPU 和 iGPU 最大化并行；decode 忙就全压给 NPU 保护 iGPU 专心 decode。

**按需 NPU 核预热**：请求一进队列，CPU 就在后台偷偷开始编译这个请求的余量对应的 NPU 内核（比如 [188, 4096] 这种没预编译过的形状）。等请求真正轮到执行时，编译可能已经做完，余量也能进 NPU；做不完就降级给 iGPU。**编译时间和排队时间重叠掉了**。

**细粒度抢占 + Slack-Aware Piggybacking**：reactive 来了能在 layer 粒度抢占正在跑的 proactive；同时把 proactive 任务按序列长度排序，优先把短的塞进 reactive batch 的空闲 slot 里搭车（piggyback），上限 Bcap=3 防撑爆；等太久的 proactive 走「老化提权」，绕过 Bcap，强行进 batch。

## 效果

平台是 Intel Core Ultra 5 125H + 64GB DDR5，跑 Llama-3B / 8B：

- 纯 proactive 场景：相对 OpenVINO（iGPU）吞吐 **2.0–2.4×**，相对 Serial NPU-iGPU 是 **1.4–4.9×**；
- 混合负载（6 proactive + 3 reactive req/min，3B 模型）：reactive 平均延迟降 **93.84%**，proactive 同时还改善 **34.4%**；
- proactive 请求率从 4 涨到 10 req/min 时，reactive 延迟基本不退化。

## 想了几轮才理顺的事

这篇文章我和 Claude 来回辩了挺久，记一下几个我自己一开始没想清楚的点。

**为什么 NPU 必须 AOT，根因在硬件**。我一开始以为是「软件栈不支持 JIT」，其实更深一层：NPU 的 MAC 阵列没有「线程」的概念，数据流路径是固定的硬件流水线，整条流水线的节拍由编译器提前算死。换形状不是「换个参数」，而是「整条流水线的节拍都不一样了」——切块、scratchpad 分配、DMA 搬运时机全部要重新规划。NPU 硬件里没有 if、没有 for 计数器这种灵活控制结构，所以新形状必须重新跑一遍编译器、生成新内核。这是结构性的，不是工具链问题。

**iGPU 处理动态形状不是「JIT」**。这点我一开始绕进去了：余量给 iGPU 的话，iGPU 不也要现场编译？后来才理顺：iGPU 的内核是用高级语言（OpenCL 这种）写的**带参数的通用程序**——M、N、K 是运行时传入的，编译只在系统启动时做一次，之后任何形状都通过填参数 + 派发对应数量的线程来适配，运行时**完全没有编译开销**。

所以两边的对比是：
- NPU：每个新形状都要 CPU 跑编译器秒级现场编一份新内核；
- iGPU：内核启动时就编译好了，运行时只是改几个参数，微秒级。

iGPU 的「灵活」不是因为它能 JIT，而是因为它的硬件抽象层比 NPU 高一级——SIMT 模型自带控制流，编译产物就是参数化的程序而不是写死的执行计划。

**双缓冲 + 共享地址空间**。SoC 上的零拷贝抢占其实是两个东西配合的：

1. CPU / NPU / iGPU 共享同一块 DDR 物理内存，且共享同一个虚拟地址空间——KV cache 放在 0x100000000 这种地址，三方看到的都是同一份数据，切换任务时 KV cache **不需要任何拷贝**，只改指针。
2. 给 reactive 和 proactive 各开一份 activation 缓冲区——两边各算各的中间值，互不覆盖，切换就是切指针。

我一开始担心双缓冲会占很多内存，算了一下其实很小：~64MB 量级（只存「当前正在算的这一层」的 activation，不是所有层都留着）。相比模型权重几 GB、KV cache 可能几 GB，这点开销可以忽略。

**老化提权和后台预热的耦合（这是我自己抓出来的一个细节）**。

老化提权要让饥饿的 proactive 任务能上 iGPU 做 prefill。论文的逻辑是：reactive 的余量原本是分一部分给 iGPU 的（弹性张量并行），老化触发后让 reactive 的 token-wise ops 全部塞给 NPU、把 iGPU 腾出来给 aged proactive。

但这里有个问题：reactive 的余量本来就是动态形状（188 这种），它能不能进 NPU，**取决于后台预热到没到**。如果还没到（reactive 处理特别快、排队没等多久），那余量就没法全部上 NPU，iGPU 也腾不干净，老化提权效果打折。

理顺之后：老化阈值（任务等待超过多久才老化）必然远大于编译时间（~3s），所以**大多数情况下后台预热已经做完了**，reactive 余量能全部进 NPU，iGPU 完全腾出来——这是论文描述的理想路径。少数情况下预热没赶上，系统降级到「reactive 余量仍在 iGPU、aged proactive 拿到部分 iGPU 资源」，比没有老化提权好但不是最优。

这种「两个机制在时间尺度上配合」的设计挺漂亮的——单看哪个机制都不完整，合起来才是 robust 的。

**为什么 Bcap=3**。decode 阶段最耗带宽的是 MHA，每个 batch 槽位都要把自己那份 KV cache 全读一遍。batch 越大，带宽消耗线性涨，TPOT（每 token 生成时间）也线性涨。reactive 用户对 TPOT 敏感（出字慢一眼就感觉到），所以 batch 里 proactive 不能太多。3 是个 profiling 调出来的折中——再多 reactive 体感就坏了。

## 一句话总结这篇文章在做什么

把操作系统的进程调度思想搬到片上 LLM 推理：reactive ↔ 实时进程，proactive ↔ 后台进程，NPU 和 iGPU ↔ 两种特性不同的处理器核，HEG ↔ 进程描述符，弹性调度 / 抢占 / 搭载 ↔ OS 的调度算法。云端没人care 这套，因为资源充裕；但 SoC 上每瓦每比特带宽都要算，这套思想的迁移就是真创新。

## 学到了什么

- **SoC 上能耗是比延迟更硬的约束**。云端基本不考虑这件事，但手机 / 笔电的电池就那么大，NPU 比 iGPU 能效高很多倍。所以「尽量把 prefill 压给 NPU」不只是为了快，也是为了省电——混合调度的真实价值要从「延迟 + 吞吐 + 能耗」三个轴一起看。
- **统一内存 vs 离散 GPU 的设计哲学完全不同**。云端 KV cache 跨设备搬要算 PCIe 带宽，所以 KVFlow 那种 proactive prefetch 才有意义；SoC 上三种计算单元共享同一块 DDR、同一个虚拟地址空间，切换任务连 KV cache 都不用拷贝，只改指针。但代价是 NPU 和 iGPU 同时跑会争 DDR 带宽，需要从阶段层面（Stage Elasticity）规划好谁主导哪个阶段。
- **「灵活」和「JIT」不是一回事**。我之前一直把 iGPU 处理动态形状的能力叫作「JIT」，其实它不需要 JIT——内核启动时编译一次，运行时只是改参数 + 派发不同数量的线程。真正必须 JIT 的是 NPU，但 NPU 又恰恰做不到 JIT，所以才需要 chunk + 预热这套间接方案绕过去。

## 几个开放问题

- **Bcap=3 是不是普适的**。这是在 Intel Ultra 5 + Llama-3B/8B 上 profiling 出来的，换硬件（比如手机的高通 Hexagon NPU）、换模型规模，最优值肯定不一样。能不能做成自适应——根据当前 KV cache 总量和带宽利用率动态调？
- **和 KVFlow 在 SoC 上叠加会怎样**。KVFlow 解决的是多 agent workflow 里 KV cache 跨调用复用的调度感知，Agent.xpu 解决的是 SoC 上异构计算单元的协同，两者其实正交。SoC 上是统一内存，KVFlow 原本要走 PCIe 的 prefetch 开销没了，但调度感知的淘汰策略依然有效——把这两个机制合到一起，应该是片上多 agent 推理的合理形态。
- **stream-aware 抽象能不能做成通用 runtime 接口**。现在 OpenVINO、SGLang 这种引擎本质上是单流的，agent 框架自己得管多任务优先级。如果把「reactive / proactive」这种 stream 标签提到推理引擎的标准接口里，做一个统一的 stream-aware runtime，上层 agent 框架（Magentic-One、AutoGen 这种）就能直接吃到这个收益——这是个具体的工程方向。
