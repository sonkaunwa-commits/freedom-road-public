# FREOVIA / Freedom Road — WeChat Channel Strategy

> 2026-08-30
> 本文件定义远序系统的微信入口分层、技术选型与实施边界。目标不是让单一微信入口承担全部职责，而是将公开服务、私人 Agent 控制和未来企业协作分成独立 Channel，并统一接入 FREOVIA 的消息与上下文基础设施。

## 1. 结论

远序微信入口采用三层模型：

1. **微信公众号：Public / Brand / Service Channel**
   - 承担品牌、文章、菜单、网页入口、公开通知与未来商业服务；
   - 不作为远序私人控制面的主要实现；
   - 与私人账户状态、内部 Agent 权限保持隔离。

2. **微信私人 Agent 入口：Private AI / Agent Channel**
   - 新增为正式规划能力；
   - 当前首选技术候选为腾讯微信团队维护的 `@tencent-weixin/openclaw-weixin`，底层走 iLink 通道；
   - 目标是支持微信内 1:1 指令、问答、文件/媒体进入 Smart Inbox / Unified Capture Layer，并把 Agent 结果回传微信；
   - 不把 FREOVIA 核心业务逻辑绑定到 OpenClaw 或任何单一微信 SDK。

3. **企业微信 / 微信客服：Organization / Customer Channel**
   - 作为未来公司协作、共享 Agent、客户服务和多人权限场景的候选；
   - 不替代私人微信入口，也不替代公众号品牌入口。

## 2. 技术路线判断

### 首选：腾讯官方 openclaw-weixin / iLink

当前优先评估：
- `Tencent/openclaw-weixin`
- npm：`@tencent-weixin/openclaw-weixin`

选择理由：
- 由腾讯微信团队维护，优先级高于社区逆向协议、PC Hook、模拟点击等方案；
- 支持二维码授权登录；
- 当前官方/上游文档明确支持 Direct Chat 与媒体消息；
- 微信协议层作为独立 Channel 插件存在，适合借鉴其 Channel Adapter 思路；
- 可以先做 PoC，不要求立即把 FREOVIA 迁移到 OpenClaw。

### 备选：FREOVIA Native iLink Adapter

如果后续确认 iLink 存在稳定、可维护、适合独立接入的官方接口边界，可实现 FREOVIA 自己的 iLink Adapter，避免引入完整 OpenClaw Runtime。

原则：
- 只替换 Channel Adapter；
- Agent Router、Smart Inbox、权限、审计、知识层不随微信接入方案变化。

### 不作为核心方案：Wechaty / PadLocal / Hook 类方案

可用于能力参考或实验，但默认不作为远序核心私人入口。主要原因：
- 不同 Puppet/协议供应方长期可用性差异较大；
- 部分方案依赖 Token、Web/Pad/客户端协议或 Hook；
- 维护成本、兼容性和账号风险高于官方 iLink 路线。

只有在官方路线无法满足明确必要能力，例如群场景或特殊消息类型，且经过风险评估后，才重新比较。

## 3. 目标架构

```text
WeChat Private Bot / iLink
          │
          ▼
MessagingChannelAdapter
          │
          ▼
FREOVIA Messaging Gateway
          │
     ┌────┴────┐
     │         │
Identity    Permission
Allowlist   Audit / Rate Limit
     │         │
     └────┬────┘
          ▼
Unified Capture Layer / Smart Inbox
          │
          ▼
Agent Router / Intent Router
          │
 ┌────────┼─────────┬──────────┐
Investment  Work   Knowledge  Roadmap / Tasks
          │
          ▼
Response Normalizer
          │
          ▼
WeChat Reply
```

公众号走独立的 Public Gateway，不直接复用私人 Agent 权限：

```text
WeChat Official Account
        │
        ▼
Public Gateway
        │
Content / Menu / Web Entry / Public Service
        │
        ▼
FREOVIA public-safe capabilities
```

未来企业微信再作为第三个 Channel Adapter 接入同一 Messaging Gateway。

## 4. 强制设计原则

### 4.1 Channel 与 Core 解耦
定义统一 `MessagingChannelAdapter`，至少抽象：
- inbound message；
- outbound message；
- sender / account identity；
- text / image / voice / file；
- reply context；
- delivery status；
- health / reconnect state。

不得把 iLink Token、OpenClaw Session 或微信特有字段渗透到投资、工作、Knowledge、Roadmap 等核心模块。

### 4.2 私人入口必须先过身份与权限门禁
私人微信入口不是万能管理员直通车。至少需要：
- owner allowlist；
- sender identity mapping；
- 高风险操作二次确认；
- command / intent permission；
- audit log；
- replay / duplicate protection；
- rate limit；
- credential local/private storage。

### 4.3 Capture 与 Execute 分离
微信发来的内容先判断是：
- Capture：记录想法、文件、任务、资料；
- Query：查询状态、报告、知识；
- Execute：执行变更、启动工作流；
- Notify：系统主动回传。

Capture 默认允许进入 Smart Inbox；Execute 必须经过更严格权限与确认规则。

### 4.4 公众号与私人通道数据边界
公众号默认只能访问 public-safe capability；私人投资账户、内部工作状态、私人 Knowledge 与 Agent 控制面不得因为共用微信生态而自动暴露给公众号访问者。

## 5. Roadmap Work Packages

### WX-00 — Messaging Channel Abstraction
优先级：P1

建立 `MessagingChannelAdapter`、统一消息对象、身份映射、Inbound/Outbound contract。先做接口，不绑定具体供应商。

### WX-01 — Tencent iLink / openclaw-weixin PoC
优先级：P1

最小验证：
- QR 授权；
- 单账号 1:1 文本收发；
- 服务重启后的恢复；
- 基础错误处理；
- 与 FREOVIA Gateway 的最小桥接。

PoC 的目标是验证通道，不是引入 OpenClaw 作为 FREOVIA 新核心。

### WX-02 — Smart Inbox Capture
优先级：P1

微信内容进入 Unified Capture Layer：
- 文本；
- 图片；
- 文件；
- 语音/转写（能力验证后）；
- 来源、时间、发送者、Channel、message id 可追溯；
- 去重、分类、路由。

### WX-03 — Agent Router Integration
优先级：P1/P2

支持自然语言路由到：
- Investment；
- Work；
- Knowledge；
- Task / Project State；
- Roadmap / Research Queue；
- Status / Observatory。

### WX-04 — Security & Governance Gate
优先级：P1，正式启用前强制完成

增加：
- owner / allowlist；
- permission matrix；
- confirmation gate；
- audit trail；
- secret isolation；
- command risk levels；
- fail-closed behavior。

### WX-05 — Media & File Pipeline
优先级：P2

验证图片、文件、音频等媒体类型，统一转为 Attachment Object，进入 Smart Inbox / Knowledge intake。

### WX-06 — Outbound Notification
优先级：P2

允许远序在符合通知规则时主动回传：
- 任务完成；
- 异常告警；
- 报告完成；
- 需要用户确认的事项。

必须配置通知级别、静默规则、去重与频率控制，避免把微信变成噪声源。

### WX-07 — Channel Health / Fallback
优先级：P2

监控：
- channel online/offline；
- token/session health；
- receive/send latency；
- reconnect；
- API/插件版本兼容性。

通道异常不得影响 FREOVIA Core；失败时保留任务与消息状态，恢复后按规则重试。

### WX-08 — WeChat Official Account Public Surface
优先级：持续

保留公众号作为：
- FREOVIA 品牌入口；
- 内容发布；
- 菜单与网页入口；
- public-safe 报告/服务；
- 未来商业化与外部用户入口。

不把公众号强行改造成私人 Agent 控制通道。

### WX-09 — WeCom / WeChat Customer Service Evaluation
优先级：P2/P3

当出现公司共享、多人角色、客户服务或商业客户场景时，再评估企业微信/微信客服 Channel。

## 6. 当前实施顺序

建议顺序：

```text
Unified Capture / Smart Inbox 基础
        ↓
WX-00 Channel Abstraction
        ↓
WX-01 官方 iLink PoC
        ↓
WX-02 Capture + WX-04 Security
        ↓
WX-03 Agent Router
        ↓
WX-05 Media / WX-06 Notification
        ↓
WX-07 Reliability
```

现阶段不因微信入口研究打断正在执行的高优先级工作包；先纳入正式 Roadmap，在 Unified Capture / Smart Inbox 接口成熟后接入，可减少返工。

## 7. 重新选型触发条件

出现以下任一条件时重新比较技术路线：
- 腾讯停止维护或显著改变 iLink/openclaw-weixin；
- 官方插件无法稳定独立运行；
- 必须支持但官方通道明确不支持的群聊能力；
- 媒体/文件能力不能满足 Smart Inbox；
- 授权、合规、账号稳定性发生变化；
- 企业协作成为主需求，此时优先比较 WeCom。

结论不是永久锁死 iLink，而是把官方 iLink 路线设为当前第一候选，并通过 Channel Adapter 保留可替换性。
