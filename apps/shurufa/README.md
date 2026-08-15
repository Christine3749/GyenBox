# Shurufa Module（输入法生态）

- `apps/shurufa/ciku`
  - 词库工作台（public 面向词库与导入导出）
  - 主要 API：`/api/ciku/*`（本地开发时由 Vite 中间件提供）

- `apps/shurufa/personal-config`
  - 个人配置中心（面向设备与用户设置）
  - 主要 API：`/api/shurufa/*`（可对接 `apps/web` 的同名配置 API）

历史上这两部分曾在 `shurufagerenzhongxin/` 目录下独立维护；现在已归到 `apps/` 下统一纳管。
