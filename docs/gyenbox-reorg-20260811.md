# GyenBox 整理与冗余代码审计（2026-08-11）

## 1) 目录归拢结果
- 已将散落的两个临时目录归档到：
  - `GyenBox\_archive\2026-08-rescue\GyenBox-keep-vercel-rescue-20260811`
  - `GyenBox\_archive\2026-08-rescue\GyenBox-vercel-rescue-20260811`
- 因此 “GyenBox 主仓库” 目前集中在一个根目录：
  - `C:\Users\Ethan\Desktop\01-Projects\GyenBox`

## 2) 当前目录结构（有价值）
- `apps/*`（工作区）
- `packages/*`（工作区）
- `crates/*`（Rust 组件）
- `infra/*`（部署/运维）
- `docs/*`（文档）
- `design/`（设计索引，非构建产物）

## 3) 冗余/历史文件判定（建议优先处理）
- 根目录下有 3 个有 `package.json` 的历史工程目录：
  - `home`（name=`gyenbox`）
  - `web`（name=`@gyenbox/web`）
  - `desktop`（name=`@gyenbox/desktop`）
- 这些目录不在 `package.json` 的 workspace 覆盖范围（当前只覆盖 `apps/*`, `packages/*`），且当前可见主工作区入口是：
  - `keep`, `safeauth`, `shurufa`
- 结论：
  - 如果你只维护当前 monorepo，`home/web/desktop` 建议归档到 `_archive`，并加到 `.gitignore`。
  - 若仍需回溯，保留但保持只读（放入 `legacy`）即可。

## 4) 代码冗余风险点（基于当前状态）
- `node_modules` 在仓库中出现多个副本（`root node_modules`, `apps/shurufa/*/node_modules`），建议保持外部目录且统一通过 `.gitignore` 忽略。
- `design` 下有明显“入口索引”性质的 README，建议保留但不作为运行时代码。
- `tmp` 命名目录体量中等，建议每次收工清空或统一移入 `_archive/tmp`。
- `.claude`、`.wrangler` 是工具状态目录，建议从 git 管理中排除。

## 5) 建议执行清单
1. 在确认无回滚需要后：
   - 把 `home`, `web`, `desktop`, `tmp`, `design`, `.claude`, `.wrangler`, 根 `node_modules` 统一移动到 `GyenBox\_archive\2026-legacy`。
2. 更新 `GyenBox/.gitignore`（如果你不想再次出现）：
   - `home/`
   - `web/`
   - `desktop/`
   - `tmp/`
   - `.claude/`
   - `.wrangler/`
   - `node_modules/`（若尚未全局忽略）
3. 用 `git status --short` 做最终确认，只保留你真正要提交的变更。

## 5) 一句话版本
- 结论：当前“分散 + 历史副本”问题已消掉一半（两个临时 rescue 目录已归档），剩下冗余主要是根目录的历史工程副本，需要再做一次轻量归档。
