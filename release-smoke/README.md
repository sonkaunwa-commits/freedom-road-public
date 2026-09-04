# Release Smoke Gate

`release-smoke` 是 Freedom Road 用户可见页面的轻量发布验收工具。它用于补齐通用发布门禁，不替代 Playwright 等产品专项浏览器测试。

## 能检查什么

- 正式 URL 是否返回预期 HTTP 状态码；
- 页面是否包含本次发布的 release marker / 关键文本；
- 关键 JS、CSS、JSON 等资源是否真实可访问；
- 可选校验 `Content-Type`；
- 可声明禁止出现的旧 marker / 错误文本；
- 失败时返回非零退出码，并可输出结构化 JSON 证据。

## 运行

```bash
node scripts/release-smoke-selftest.cjs
node scripts/release-smoke-registry-selftest.cjs
node scripts/release-smoke-registry-runner-selftest.cjs
node scripts/validate-release-smoke-registry.cjs
node scripts/run-release-smoke-registry.cjs
node scripts/run-release-smoke-registry.cjs --json --output /tmp/release-smoke-registry.json
node scripts/release-smoke.cjs release-smoke/fund-assistant.v1.json
node scripts/release-smoke.cjs release-smoke/core-pages.v1.json
node scripts/release-smoke.cjs release-smoke/fund-assistant.v1.json --json --output release-status/fund-assistant-release-smoke.json
```

运行时会自动给每个 URL 加 `__release_smoke` 查询参数以绕过 CDN / 浏览器链路中的旧缓存影响，不修改配置中的正式 URL。

## Coverage Registry

`release-smoke/registry.v1.json` 是当前正式用户入口与 HTTP smoke 配置之间的机器可读绑定。每个登记入口必须：

- 有唯一 ID 和唯一正式 URL；
- `entryPath` 必须是被 Pages 根目录包含的相对目录路径：根入口仅使用 `./`，子入口使用 `fund-assistant/` 这类规范目录形式；
- 禁止 `..`、绝对 URL、`//`、前导 `/`、反斜杠、query/fragment、编码后的点段/分隔符、重复斜杠和文件式路径；
- 指向 `release-smoke/` 下真实存在的配置；
- 绑定一个真实存在的 check ID；
- 预期 HTTP 200 和 `text/html`；
- 至少检查一个 release marker 或稳定关键文本；
- 在 `site/` 中存在对应的 `index.html` 源文件，且解析结果不得逃出 `site/`；
- Registry 绑定 check 的所有 `contains` marker 必须已经存在于该本地入口源文件中，避免部署后才发现 marker 漂移。

`validate-release-smoke-registry.cjs` 只验证覆盖合同，不访问网络；因此可放进现有 Pages `verify` 阶段，在部署前发现缺配置、错路径、路径逃逸、重复入口、丢失 marker 或本地 marker 漂移。它不会创建新的定时任务或独立 workflow。

`run-release-smoke-registry.cjs` 用同一份 Registry 驱动部署后的真实 HTTP smoke。它先执行 Registry fail-closed 校验，再按 Registry 中首次出现的顺序去重 smoke config，并复用 `release-smoke.cjs` 的 HTTP、Content-Type、contains/notContains、timeout 和 cache-busting 逻辑。任一配置或任一线上断言失败，聚合结果即失败。这样 Registry 不再只是“声明覆盖”，而是实际决定通用线上验收覆盖。

Pages workflow 仍保留产品专项 smoke，用于验证基金助手版本元数据和证券页面专项行为；Registry Runner 提供所有登记入口的通用线上基线，两者职责不同，不互相替代。

## 配置

```json
{
  "name": "example-release",
  "baseUrl": "https://example.com/product/",
  "timeoutMs": 15000,
  "checks": [
    {
      "id": "entry",
      "path": "./",
      "status": 200,
      "contentTypeContains": "text/html",
      "contains": ["RELEASE_20260903"],
      "notContains": ["OLD_RELEASE_20260902"]
    },
    {
      "id": "data",
      "path": "data/manifest.json",
      "status": 200,
      "contentTypeContains": "application/json"
    }
  ]
}
```

每个 check 必须且只能使用 `path`（相对 `baseUrl`）或完整 `url` 其中一种；同一配置内 check `id` 必须唯一。`status` 省略时默认 200，显式填写时必须是 100–599 的整数 HTTP 状态码。`timeoutMs` 省略时默认 15000，显式填写时必须是正整数。非法显式值不会静默回退。`contains`、`notContains` 可为字符串或字符串数组。

## 发布纪律

配置中的 release marker 应指向准备验收的精确版本。新版本发布时同步更新 marker 和资源文件名；如果线上仍是旧版本，检查必须失败，而不是因为页面能打开就判定发布成功。

新增或替换正式用户入口时，应同步更新 Coverage Registry；不能让新入口绕过通用 smoke 覆盖。Registry 中同一个 config 可被多个入口引用，但在线 Runner 每次发布只执行该 config 一次，避免重复 HTTP 请求和无意义 Actions 时间。

该工具只做 HTTP/内容级 smoke。需要验证按钮、布局、移动端、登录状态或复杂业务交互时，继续使用对应产品的 Playwright/browser smoke。
