## 在解决什么问题

LLM 的服务范式正在从「人 ↔ LLM」往「人 ↔ LLM ↔ 环境」转。Agent 场景的特点很极端：上下文动辄几十 K 甚至上百万 token，但每一轮新增的输入和输出都很短（论文给的数据是平均上下文 56K，新增 429 token，生成 176 token）。

这种形态下 prefix caching 的命中率非常高——每一轮的前缀几乎完全等于上一轮的前缀，所以系统主要是在反复**读** KV-Cache，而不是反复**算** KV-Cache。论文用一个「cache-compute ratio」来量化：在 16K–64K 上下文下，Qwen2.5-32B 是 117–267 GB/PFLOP，DeepSeek-660B 是 17–97 GB/PFLOP——意思就是每跑 1 PFLOP 的计算，配套要从存储里读上百 GB 的 KV。

而典型的 PD 分离部署是这样的：

- 每节点 8 个 GPU，每个 GPU 配一张 400 Gbps 的**计算网卡**（CNIC，做 GPU 间集合通信用），合计 3200 Gbps；
- 整个节点**只共用一张 400 Gbps 的存储网卡**（SNIC，访问 3FS 这类分布式存储用）。

PE（Prefill Engine）需要不停从存储里拉 KV，SNIC 100% 打满；DE（Decode Engine）只做自回归生成、几乎不用碰存储，它那张 SNIC 完全闲着。整个集群的存储入口被 PE 节点这一侧的 SNIC 卡死。

## 核心洞察

KV-Cache 加载并不一定要以 Prefill 为中心。

DE 的 SNIC 闲着，CNIC 又有大量空闲带宽（推理的集合通信是亚毫秒级突发，平均利用率不高），那为什么不让 DE 的 SNIC 也去读 KV，再通过 CNIC 传给 PE？

这就是 Dual-Path Loading：

- **Path A**（保留）：3FS → PE SNIC → PE DRAM → PE HBM，PE 自己读自己用；
- **Path B**（新加）：3FS → DE SNIC → DE DRAM → CNIC 跨节点传 → PE DRAM → PE HBM，DE 帮 PE 读。

可用存储带宽从 `P × sB` 变成 `(P + D) × sB`。论文实验里 2P4D 的配置带宽提升 3×，2P8D 是 5×。

## 怎么做的

三件事。

**Layerwise Prefill**。原本 KV-Cache 是整段一起搬，现在按 Transformer 层切开。PE 算第 i 层时，第 i+1 层的 KV 在后台异步搬运，一边算一边搬。这样 I/O 就被 compute 完全 overlap 掉了，只要总传输时间不超过总计算时间，IO 等待就消失。论文也提了个工程细节：存储里仍然按整块（Full Block）存，避免文件数量爆炸；传输时切成 Layer Block，n 个 Layer Block 物理上拼起来正好就是一个 Full Block，不用做布局转换。

**CNIC-Centric 流量管理**。这块是这篇文章我觉得最巧的设计。问题是：KV 传输流量会不会干扰对延迟敏感的集合通信（AllToAll、AllReduce 这些）？答案是会——而且 GPU 的 PCIe 不支持 QoS，你没法在 PCIe 层面把两种流量分优先级。

绕开的办法是：**让所有跨节点流量都经过 CNIC**，包括同节点内的 H2D（CPU DRAM → GPU HBM）也强制走一次 CNIC Loopback RDMA。InfiniBand 本身有 Virtual Lane 机制，模型推理通信打到 VL0（高优先级，99% 带宽），KV 传输打到 VL1（低优先级，1% 兜底）。这样硬件层面就能保证 KV 传输绝对不抢推理带宽。

代价是多了一次 H2D 的 PCIe 流量，但和「集合通信被拖慢」相比这个代价可以接受。

**动态调度**。三层：
- **跨引擎**：选 SNIC 读队列短的节点接新请求，避免把流量集中在已经忙的节点上；
- **路径选择**：在选好的 PE 和 DE 里再选读队列更短的那一侧去读；
- **引擎内**：DP 各 GPU 处理不同请求，attention 时长不齐会在 FFN 同步处出气泡，论文做了一个 token 数均衡的算法把这个气泡压掉。

## 那个 P/D 比例的推导

论文 §4 给了一个看起来吓人的公式，但拆开看就是逐个网卡 / DRAM 算流量约束。

设 `s = SNIC 带宽 / CNIC 带宽`（典型 s=1），`g = 每节点 GPU 数`（典型 8），`B = CNIC 带宽`，`Bs = SNIC 带宽`，`M = DRAM 带宽`。先算每对 PE-DE 的流量：

- `Tp = sB / (Dg²)`（PE Read Path 的均摊流量）
- `Tc = sB / (Pg²)`（DE Read Path 的均摊流量）

然后对每个网卡 / DRAM 列「总流量 ≤ 带宽」的不等式。比如 PE CNIC 上的写流量是「PE 自己读进 DRAM 后 H2D」加上「DE 通过网络传过来」两部分，化简之后得 `(sB/g)(1 + D/P) ≤ B`，整理出 `P/D ≥ s/(g-s)`。其它几个约束类似推。

最终得到一个区间：

```
s/(g-s) ≤ P/D ≤ min( (g-2s)/s, (g-s)/(2s), (2M/Bs - 3)/2 )
```

代入 g=8、s=1、M=500GB/s、Bs=50GB/s，是 `1/7 ≤ P/D ≤ 3.5`，论文实验用的 2P4D（P/D=0.5）和 1P2D（P/D=0.5）都在范围内。

直觉是：DualPath 引入的额外 CNIC / DRAM 流量在合理 P/D 比例下都能被吸收，不会产生新瓶颈。这个边界推导本身就说明了「DE SNIC 这条路」不是免费的，但代价是有限且可控的。

## 为什么经过 DRAM 而不是直接 GPUDirect RDMA

我一开始想不通这个：跨节点 GPU 之间本来可以用 GPUDirect RDMA 直接 HBM ↔ HBM，何必经过 DRAM 中转一次。

论文 §4.1 自己也承认了，理论上确实可以绕过 DRAM。它选 DRAM 中转的真正原因是**减少 DE HBM 占用**。

如果直接 RDMA 进 DE HBM，那从 Prefill 第一层开始，DE 就得为这个请求预留出整个 KV-Cache 的 HBM 空间，而 Prefill 可能要几十毫秒甚至上百毫秒。这段时间里，被预占的这块 HBM 没法服务其他正在 Decode 的请求。HBM 80GB 是死贵的资源，DRAM 是 1–2TB 的便宜货。

DualPath 的取舍是：用 DRAM 当 buffer 兜住整个 Prefill 过程，等所有层都到齐了，再一次性 H2D 到 DE HBM 开始 Decode。多一次 H2D 的代价，换 DE HBM 在整个 Prefill 期间继续给别的请求做 Decode 的能力——并发上去，端到端吞吐就上去了。

Agent 场景的生成长度本来就短（176 token），TTFT 在端到端里占比不小，所以提升 Prefill 期间的并发非常划算。

## 效果

- 离线批量推理：DeepSeek-660B 最高 1.87×，平均接近 Oracle（跳过所有 I/O 的理论上限）；
- 在线服务：DS-660B 吞吐 2.25× 且不破 SLO，平均 1.96×；
- 消融：Layerwise Prefill 单独贡献 17.21%，加 Dual-Path Loading 涨到 38.19%，再加调度算法到 45.62%，所以 Dual-Path Loading 才是最大的那一块；
- 可扩展性：跑到 1152 GPU（48P96D），离线 JCT 几乎不变（3167s vs 3201s），近线性。

## 学到了什么

这篇文章其实是我把整个数据中心 GPU 系统的低层架构补完的一篇——读论文的过程中往下挖了好多次，记几个我之前没真正分清楚的点。

- **CNIC 和 SNIC 的角色完全不同，但形态可能一样**。两者都是 RDMA 网卡，但接的网络物理隔离：CNIC 接计算网络（GPU 间通信、KV 跨节点传输），SNIC 接存储网络（访问 3FS）。每节点配 8 个 CNIC（每 GPU 一个）、只配 1 个 SNIC——这是数据中心硬件的常见配置，不是这一篇独有的。
- **HBM 是封装在 GPU 旁边、不是片上**。HBM 通过硅中介层（Silicon Interposer）和 GPU Die 紧挨在一起，CoWoS 封装把它们做成一个对外看起来是单芯片的整体。HBM 自己又是 8 层 DRAM Die 用 TSV 堆叠的。这跟我以前模糊以为的「HBM 在 GPU 内部」不一样——它在旁边，但封装在同一块基板上。
- **PCIe 不是 Bus 是点对点串行链路**。「Bus」这个名字是历史包袱，现代 PCIe 是 switched 网络。同一个 PCIe Switch 下的设备可以做 P2P 通信，不需要走 CPU——这就是 GPUDirect RDMA 能成立的硬件前提。
- **CNIC 做 H2D 比 CUDA Copy Engine 更快，而且能被 QoS 控制**。CUDA Copy 每次提交的 5–7μs 软件开销，对 layerwise 这种细粒度场景是致命的；CNIC 的 RDMA Write 是 1μs 量级，而且支持 doorbell batching。更关键的是 CNIC 路径能被 InfiniBand VL 仲裁，KV 流量永远不会挤占推理通信——这是工程上选这条路的本质原因。
- **NVLink / NVSwitch / NVLink Switch 是三个不同的概念**。NVLink 是协议，NVSwitch 是节点内连 8 GPU 的交叉芯片，NVLink Switch 是 Blackwell 才引入的、把 NVSwitch 做成外置盒子用来跨节点连 GPU 的设备。GB200 NVL72 用的就是后者，72 GPU 全 NVLink 互联。
- **「带宽不被切」≠「带宽够用」**。这是我读 KVFlow 时就摔过一次的坑，DualPath 这里又见到一次：PCIe 支持多路并发 DMA，64 个传输不会被串行化，但**总数据量 / 总带宽**这个上限是物理事实，并发越高单位时间能搬的总量就接近上限——这是高并发场景下 cache 备份反而比重算慢的根因。

## 几个开放问题

- **NVLink Switch 出现之后这套设计还成立吗**。GB200 NVL72 把 72 GPU 用 NVLink 全互联（1800 GB/s），跨节点的 KV 传输不再受 InfiniBand 400Gbps 的限制。这时候 SNIC 这一侧的瓶颈会变得更突出（CNIC 一侧带宽暴涨，SNIC 没动），DualPath 让所有节点 SNIC 都参与的设计反而更有价值。但 VL 那套 QoS 在 NVLink 上能不能复用，我没看出来。
- **Layerwise Prefill 对模型类型的依赖**。MoE 模型每一层 expert 不一样、KV 形态可能不齐，layerwise overlap 是不是会变难？论文实验用 DeepSeek 660B（MoE）跑出来效果最好，说明工程上是可以做的，但具体是怎么处理 expert routing 的细节没看清。
- **3FS 的角色能不能换**。DualPath 假设了一个高吞吐的分布式存储后端（DeepSeek 的 3FS）。如果换成商用的 NVMe-oF 或者云厂商的对象存储，SNIC 这一侧的瓶颈会前置到存储侧，整个分析的前提会变。这套方法在非 DeepSeek 的硬件栈上能落地多少，是个开放问题。
