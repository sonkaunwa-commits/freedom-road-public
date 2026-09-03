# Publication Boundary Guard

`Publication Boundary Guard` 是 Freedom Road 公共发布层的 fail-closed 检查器，用于落实 Roadmap 中 public/private publication boundary 的 P0 约束。

它只检查准备公开发布的目录，默认是 `site/`，不读取私人账户仓库，也不需要任何密钥。

## 当前检查

- 高置信度密钥/令牌格式：私钥 PEM、GitHub token、AWS access key、OpenAI secret key、Slack token；
- 公共目录内禁止出现 `.env`、PEM/KEY、P12/PFX、SQLite/DB 等敏感文件；
- JSON 中禁止出现账户号、私人成本、私人仓位、私人余额、访问令牌、密码、credential 等私有字段名；
- `site/publication.json` 必须保留来源仓库、来源 commit 和生成时间等 provenance 字段；
- JSON 语法错误直接失败，不允许损坏的公共数据静默发布；
- 报告只记录规则、文件和位置，不复制检测到的秘密值。

## 使用

```bash
python3 scripts/test_publication_boundary.py
python3 scripts/validate_publication_boundary.py
python3 scripts/validate_publication_boundary.py --json --output release-status/publication-boundary.json
```

退出码：`0` 为通过，`1` 为发现发布边界问题，`2` 为策略/配置错误。

## 设计边界

该工具不是通用 DLP，也不能证明公开数据绝对不含任何私人信息。规则优先选择高置信度、低误报项；新增字段或数据产品时，应按实际数据契约扩展 `policy.v1.json`。真正的私人持仓、成本、资金规模、执行计划和凭据仍必须在上游 private layer 阻断，不能依赖发布前扫描器兜底。

默认不新增 GitHub Actions 定时任务。可由现有服务器发布流程、CI runner 或人工发布前检查调用，以符合低边际成本执行原则。
