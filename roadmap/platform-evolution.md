# Freedom Road / FREOVIA Platform Evolution Roadmap

> 2026-09-02
> 本文件记录 Freedom Road / FREOVIA 的通用平台能力演进。目标不是堆叠热门 Skill，而是把高价值能力沉淀为可复用、可评估、可替换、可持续维护的系统基础设施。

## 1. 设计系统 / DESIGN.md

### 定位
建立一份长期维护的 `DESIGN.md`，作为所有用户可见界面和报告页面的统一视觉约束层。它与 `AGENTS.md` / 工程规则互补：

- 工程规则负责如何开发、测试、发布；
- DESIGN.md 负责页面应该如何呈现；
- 具体产品可以有自己的 theme，但必须继承统一的基础设计 token 和可用性原则。

### 覆盖范围
- 投资报告中心；
- Dashboard / 控制台；
- 研究工作台；
- 公众号/内容工具；
- 基金小帮手等独立产品的公共 UI 组件；
- 后续 Agent 生成的网页、图表和轻量工具。

### 第一阶段
- 统一颜色、字体、间距、圆角、表格、卡片、状态色；
- 定义移动端优先规则；
- 定义金融数据 freshness / degraded / unavailable 的视觉状态；
- 定义报告页面标题、摘要、数据来源、更新时间、风险提示的固定层级；
- 与 Release Quality Gate 联动，线上验收不仅检查功能，也检查设计一致性。

### 原则
不直接复制某一家产品 UI。外部 DESIGN.md / 设计系统只作为模式参考，最终形成 Freedom Road 自己的设计语言。

## 2. Research Orchestrator / 研究编排器

### 定位
把搜索一下然后给结论升级为可追踪的研究流水线。

```text
Research Request
  → Source Discovery
  → Source Quality / Freshness Filter
  → Evidence Extraction
  → Comparison / Contradiction Check
  → Thesis / Findings
  → Confidence
  → Report
  → Archive / Reuse
```

### 强制能力
- 保存来源与时间；
- 记录来源等级与 freshness；
- 区分事实、推断、观点；
- 对关键结论保留 supporting evidence；
- 发现来源冲突时显式记录；
- 输出可回溯的研究记录，而不是只保存最终答案。

### 复用场景
- 投资研究；
- 新工具/Skill 调研；
- Roadmap 技术选型；
- 公众号选题验证；
- 产品比较；
- 供应商/方案研究。

### 长期方向
Research Orchestrator 作为平台服务，不与某个 LLM 或搜索工具绑定。后续允许不同研究步骤由不同模型或工具执行。

## 3. Creator Engine / 内容生产闭环

### 定位
公众号、自媒体和内容实验不单独堆一组写作 Skill，而是建立端到端内容闭环：

```text
Trend / Topic
  → Research
  → Thesis
  → Draft
  → Style Check
  → Visual
  → Publish
  → Performance
  → Learn
```

### 关键原则
- 选题优先于润色；
- 研究先于生成；
- 人负责观点、结构、最终取舍，AI 负责扩展、整理、检查和制作；
- 同一内容允许多平台复用，但必须适配平台；
- 发布后的真实数据必须回流到选题与写作策略。

### 与公众号副业实验的关系
公众号是 Creator Engine 的一个实验 Channel，不预设一定能赚钱，也不把 AI 自动写作本身视为商业模式。先用低成本实验验证：
- 选题命中率；
- 阅读/收藏/转发；
- 粉丝增长；
- 单篇生产时间；
- 变现路径；
- 是否值得继续投入。

如果数据长期不支持，则降低优先级，不因沉没成本继续。

## 4. Model Router / 模型路由

### 定位
所有 Agent 和工作流不默认使用同一个最强模型。根据任务价值，在质量、延迟、成本之间动态选择。

### 路由维度
- Task Complexity；
- Risk Level；
- Required Accuracy；
- Latency Requirement；
- Context Size；
- Tool Need；
- Cost Budget；
- Need for Cross-check。

### 初始分层
- L0：格式转换、抽取、分类、简单归纳 → 低成本模型；
- L1：常规研究、整理、写作辅助 → 中档模型；
- L2：高价值投资研究、复杂系统设计、关键判断 → 强模型；
- L3：高风险/高价值结论 → 强模型 + 独立复核或第二模型验证。

### 评估指标
每类任务记录：
- 成功率；
- 人工修正率；
- 延迟；
- token / monetary cost；
- 失败类型；
- 模型切换收益。

最终目标不是最便宜模型，而是最优 `Quality × Latency × Cost`。

## 5. Skill Registry + Evaluation / 技能注册表与评估体系

### 定位
任何新 Skill、MCP、Agent、开源工具进入系统前，都先登记、评估、试用，再决定是否进入生产。

### 每项能力至少记录
- 名称与来源；
- 解决的问题；
- 输入/输出；
- 所需权限；
- 与现有能力的重复度；
- 维护活跃度；
- 安全/隐私风险；
- 成本；
- 成功率；
- 延迟；
- 当前状态：Watch / Pilot / Approved / Deprecated；
- 替代方案；
- 最近评估时间。

### 准入流程
```text
Discover
 → Register
 → Static Review
 → Sandbox / Pilot
 → Benchmark
 → Approve / Reject
 → Production Monitoring
 → Re-evaluate / Deprecate
```

### 核心目标
避免系统因为持续吸收新工具而越来越复杂。新增能力必须产生明确净收益，否则不进入核心。

## 6. 与现有 Roadmap 的关系

### 投资系统
- Research Orchestrator 为策略、公司、行业、事件研究提供共用研究底座；
- Model Router 控制报告、研究、候选池解释、复杂回测分析的模型成本；
- Skill Registry 管理量化框架、数据源、MCP、Agent 工具；
- DESIGN.md 统一投资报告中心、Dashboard、研究工作台。

### 微信 / 内容入口
- Creator Engine 与公众号 Public Channel 对接；
- 私人微信 Agent 继续走 Messaging Gateway / Smart Inbox，不与公众号内容生产混为一套权限；
- 内容生成类 Skill 由 Skill Registry 统一管理。

### Release Quality Gate
- Design consistency 增加为用户可见页面发布验收项；
- Skill/Model 变更如果影响线上行为，应进入版本记录和回归测试；
- Model Router 的 fallback 不得静默降低关键任务质量而不记录。

## 7. 优先级

### P0 / 长期原则
- 不因热门项目直接引入生产；
- public/private boundary 不变；
- 数据质量、权限、审计优先于自动化程度；
- 关键金融决策不因降本而自动降级模型。

### P1
1. Skill Registry 数据结构与最小登记流程；
2. DESIGN.md 第一版；
3. Research Orchestrator 最小可追踪流水线；
4. Model Router 的任务分级、成本/质量日志。

### P2
1. Creator Engine 完整闭环；
2. 自动 benchmark / regression；
3. 模型 A/B 与多模型复核；
4. Skill 自动健康检查、版本变更提醒；
5. 内容表现数据回流和策略学习。

## 8. 实施顺序

```text
Skill Registry
      ↓
DESIGN.md + Research Orchestrator
      ↓
Model Router
      ↓
Creator Engine Pilot
      ↓
Benchmark / Feedback / Auto-Evaluation
```

先建立选择和评估能力的能力，再扩大功能数量。