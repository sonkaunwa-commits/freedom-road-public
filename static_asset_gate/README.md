# Static Asset Reference Gate

`Static Asset Reference Gate` 在 GitHub Pages 部署前离线扫描 `site/**/*.html` 中的本地静态资源引用，避免页面提交成功但 JS、CSS、manifest、图片或字体路径已经失效。

## V1 检查范围

默认读取 `static_asset_gate/policy.v1.json`，检查 HTML 的 `src`、`href`、`poster` 属性。只有配置中的静态资源扩展名进入存在性检查，因此普通页面导航链接不会被这个 Gate 冒充成路由测试。

本地引用会先移除 query/fragment 再解析：

- 相对路径按当前 HTML 所在目录解析；
- 以 `/` 开头的资源按 public `site/` 根解析；
- `..` 可以用于站点内部相对定位，但一旦解析结果越过 `site/` 根立即 fail closed；
- 本地静态资源不存在时立即失败；
- `http/https`、协议相对 URL、`data:`、`mailto:`、`tel:`、`javascript:`、`blob:` 和 `#fragment` 明确作为非本地资源忽略。

V1 不负责验证外部 CDN 是否在线，也不解析 CSS 文件内部的 `url(...)`。线上 HTTP/release marker 仍由 `release-smoke` 负责，复杂交互仍由产品专项 browser smoke 负责。

## 运行

```bash
python3 scripts/test_static_asset_references.py
python3 scripts/validate-static-asset-references.py
python3 scripts/validate-static-asset-references.py --json
python3 scripts/validate-static-asset-references.py --json --output release-status/static-assets.json
```

`--policy` 与 `--output` 都是 **repository-relative** 路径。绝对路径、`..` 越界以及通过符号链接逃出仓库的路径都会在读取策略或创建输出文件前 fail closed。这样发布门禁不会因为调用参数被改写而读取或写入 checkout 之外的文件。`site_root` 与页面内静态资源路径继续执行各自已有的仓库/站点根边界检查。

退出码：`0` 为通过，`1` 为发现缺失/越界资源，`2` 为策略、路径或运行配置错误。

## 发布纪律

该 Gate 复用现有 `deploy-pages` 的 `verify` 阶段，不新增独立定时任务或工作流。任何新增静态资源类型如需成为强制检查对象，应先加入 policy 并补回归样例；不得为了让 CI 变绿而把真实缺失资源加入 ignore。
