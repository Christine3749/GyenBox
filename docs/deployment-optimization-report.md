# GyenBox 部署优化报告

> 触发：一次"收口部署"耗时约 **40 分钟**（v0.1.20，桌面 hover 修复版）。
> 目的：解剖时间去向 → 定位根因 → 给出可落地的优化方案与目标态。
> 基于：本次部署的实际命令轨迹 + 仓库现有部署基建（`Dockerfile`、`.gcloudignore`、`docs/deployment-safety-runbook.md`）。
> 日期：2026-06-28

---

## 0. TL;DR

- 40 分钟里**真正"在干活"的只有 ~13 分钟**（GCP 8m + Vercel 1m42s + R2 两次 103MB + web build）；**其余 ~27 分钟是"千刀流"开销**：沙盒 EPERM 失败重跑、GCP 项目/路径配错重试、反复探索 runbook/CLI、验证重试。
- **头号根因：没有 CI/CD**（仓库无 `.github/workflows`），一切手工、串行、每次重新发现。
- **三个最大单点**：① GCP Cloud Run `--source` 冷构建 8m；② 103MB 安装包**上传两遍**+ TLS 抖动重试；③ 沙盒 `spawn EPERM` 让每个重命令"失败一次再提权重跑"。
- **目标态**：打 tag → CI 并行发布 → 人工 ~2 分钟、墙钟 ~8–10 分钟。

---

## 1. 时间去向解剖

| 阶段 | 估时 | 性质 | 根因 |
|---|---|---|---|
| 探索/确认 runbook、加载 Vercel/Wrangler/GCP 约定 | ~3–5m | 浪费 | 流程在脑子/文档里，未脚本化，每次重新发现 |
| 沙盒 `spawn EPERM`（electron-builder / next build / wrangler）失败 → 提权重跑 | ~4–6m | 浪费 | 部署类 CLI 在沙盒里跑不了，等于每个重步骤试两遍 |
| Web `npm run build` | 50s | 必要 | — |
| Web typecheck ×3 + 并行 build/typecheck 误报排查 | ~2–3m | 半浪费 | build 与 typecheck 并行产生瞬时 `.next/types` 竞态，触发假阳性调查 |
| GCP 默认 project 配错（`prism-edge-7586` ≠ `gyenbox`）+ 定位 | ~2m | 浪费 | 无固定部署脚本写死 `--project` |
| GCP Cloud Run 部署**失败 2 次**（提权 cwd 不在工作区、`.env.local` 路径错） | ~2–3m | 浪费 | 路径/cwd 未固化 |
| **GCP Cloud Run `--source` 部署成功** | **8m 1s** | 部分必要 | 远程冷构建、无层缓存、`npm install` 全量、整仓上下文 |
| R2 上传 versioned EXE (103MB) | 1m 17s | 必要 | — |
| R2 上传 latest EXE (**同一个 103MB 再传一遍**) | 1m 13s | **可消除** | latest 与 versioned 字节相同，却又整传一次 |
| R2 `.blockmap` ×2 + 主包重试（fetch/schannel 断） | ~1–2m | 半必要 | 大文件单请求 PUT，无 multipart，靠重试兜 |
| Cloudflare Worker dry-run + deploy | ~1m | 必要 | — |
| Vercel `--prod` | 1m 42s | 冗余? | 第三个 web 出口，见 §2.5 |
| 公网验证 curl ×N + TLS 抖动重试（range 兜底） | ~2–3m | 必要但可自动化 | 手工逐条验证 |
| GitHub：查改动边界后**未推** | ~1m | 正确刹车 | 工作树混 3000+ 行累积稿 |

> 注：8m1s / 1m42s / 1m17s / 1m13s / 50s 为日志明确值；其余为据轨迹估算。

---

## 2. 根因分类

### 2.1 没有 CI/CD（头号）
仓库无 `.github/workflows`。发布 = 一个人在本机按 runbook 手敲 R2 → GCP → Cloudflare → Vercel → 验证，**全串行**。每次都要重新发现 project、路径、约定。这是 27 分钟"千刀流"开销的总来源。

### 2.2 GCP Cloud Run `--source` 每次冷构建（8 分钟）
看 `Dockerfile`：
- `RUN npm install`（非 `npm ci`，无 cache mount）→ 每次全量装依赖。
- `COPY . .` 在 builder 阶段 → 任意文件变更都使后续层缓存全失效。
- `--source .` 走 Cloud Build 远程构建：上传上下文 → 全新构建 VM → 推镜像 → 部署，**跨次部署默认无 Docker 层缓存**。
→ 结果就是每次 ~8 分钟，无论改动多小。

### 2.3 103MB 安装包传两遍 + 大文件单请求 PUT
versioned 和 latest 是**字节相同**的同一个文件，却各整传一次 103MB；且单请求 PUT 遇 TLS/fetch 抖动只能整体重试。

### 2.4 沙盒 `spawn EPERM`
electron-builder、next build、wrangler、gcloud 在沙盒里子进程被拦，统统"先失败、再提权重跑"。部署类命令本就该提权/出沙盒直跑。

### 2.5 三个 web 生产出口
GCP Cloud Run（主 origin）+ Cloudflare Worker（路由）+ Vercel（"备用"）。每次发布要部署/验证三套，工作量与验证面 ×3。Worker+GCP 是真实链路；**Vercel 是否每版都必须推，值得重新评估**。

### 2.6 流程未脚本化
project、region、`apps/web/.env.local` 路径、cwd、验证命令全靠临场发现/重试。runbook 是"给人读的文字"，不是"能跑的脚本"。

---

## 3. 优化方案（按收益排序）

### P0 — 建 CI/CD 流水线（GitHub Actions，打 release tag 触发）
**消除 §2.1 全部开销 + §2.4。** 并行 job + 缓存：
- `desktop`：build → R2 发布（见 P2）
- `web`：build 镜像（带层缓存）→ Cloud Run 部署（见 P1）→ Worker 部署
- `verify`：自动跑 runbook §50 的验证 curl，全绿才算成功
- 缓存 npm、Next（`.next/cache`）、Docker layer
**收益：人工 40m→~2m（打 tag），墙钟 ~8–10m，且并行。**

### P1 — GCP 构建提速（8m → ~1–2m）
二选一：
- **(推荐) CI 预构建镜像 + `gcloud run deploy --image`**：在 Actions 里用 BuildKit + 层缓存构镜像推 Artifact Registry，部署只做"换镜像"，~30–60s。
- 或 **Cloud Build 触发器 + Kaniko 缓存**，push 即增量构建。
配套改 `Dockerfile`：
- `npm install` → `npm ci`（确定性、更快）
- 加 BuildKit cache mount：`RUN --mount=type=cache,target=/root/.npm npm ci`
- 把 `COPY . .` 拆细：先 copy 各 workspace 的 `package.json` 装依赖（已做一半），源码层尽量靠后，最大化层缓存命中。

### P2 — R2：传一次 + 服务端复制 latest（省 ~2–3m + 去抖动）
- versioned EXE **只传一次**；`latest` 用 **服务端复制**（S3 `CopyObject` 打 R2 endpoint）生成，不再二传 103MB。
- 大文件用 **multipart upload**，断点只重传分片，不整体重来。
- **更优**：根本不存两份。只存 versioned 对象，`/api/releases/desktop/windows` 读一个小 `latest.json` 清单决定指向 → "发 latest" 退化成**改一行清单**，几乎零耗时、零抖动。

### P3 — 部署命令提权/出沙盒直跑（去 §2.4 双跑）
gcloud / wrangler / vercel / electron-builder / next build 在部署语境下**默认提权或加入沙盒允许名单**，不要"失败一次再提权"。

### P4 — 把 runbook 固化成脚本（去 §2.6 重新发现）
`scripts/deploy-web.ps1` / `deploy-desktop.ps1`（或 Makefile target）：
- 写死 `--project gyenbox --region asia-east1`
- 写死 `apps/web/.env.local` 路径与绝对 cwd
- 按 runbook 顺序执行 + 内置 §50 验证 curl
- 即使暂不上 CI，本机跑这个脚本也能砍掉一大半"千刀流"。

### P5 — 评估 web 出口数量
确认 Vercel 是"真备用"还是历史遗留。若保留：放进 CI 并行、且**非阻塞**（不因 Vercel 慢拖住主链路验证）。若不需要：每版省 1m42s + 一套验证。

### P6 — 验证确定化
不要并行跑 build + typecheck（会有 `.next/types` 竞态假阳性）。CI 里分 job：build → typecheck 依赖 build 产物；或 typecheck 用独立 tsconfig 不依赖 `.next/types`。

### P7 — 按改动范围选择性部署
CI 用 path filter：只改 web 就别重发桌面包，只改桌面就别重构 web。本次"hover 小修"其实只需重发桌面（因版本号），web 是被顺带全量重构的。

---

## 4. 目标态

```
开发者: git tag v0.1.21 && git push --tags
        │
        ▼   GitHub Actions（并行）
┌────────────────────┬─────────────────────┬────────────────────┐
│ job: desktop       │ job: web             │ job: worker        │
│ build → R2 versioned│ npm ci → 构建镜像     │ wrangler deploy    │
│ → 改 latest.json    │ (层缓存) → push AR    │ (路由不变多数免跑)  │
│                    │ → run deploy --image  │                    │
└────────────────────┴──────────┬──────────┴────────────────────┘
                                 ▼
                    job: verify（runbook §50 curl 全绿才 pass）
                                 ▼
                         GitHub Release 标记成功
```
预期：**人工 ~2 分钟，墙钟 ~8–10 分钟，可回溯、可回滚、零"重新发现"。**

---

## 5. 本周就能做的最小改动（不必等完整 CI）

1. **P4 脚本化** `scripts/deploy-web.ps1` + `deploy-desktop.ps1`，写死 project/region/路径/验证 → 立刻砍掉项目配错、cwd、路径、验证那几段浪费。
2. **P2 的轻量版**：R2 改"传一次 + CopyObject 生成 latest"，省掉第二个 103MB。
3. **P3**：部署脚本统一提权运行。
4. `Dockerfile` 改 `npm ci` + cache mount（P1 的一半，单独就能让冷构建快一截）。

完整 P0/P1（CI + 镜像部署）作为下一步立项。

---

## 6. 附:风险与约束（沿用现有 runbook）

优化**不得违背** `docs/deployment-safety-runbook.md` 的硬规则：
- 新 origin 验证通过前，绝不删旧 origin（这正是 2026-06-27 `525` 事故根因）。
- 自动化的 `verify` job 必须走**真实公网域名** `gyenbox.com`，不能用 `run.app`/Vercel 成功冒充。
- 镜像/部署需保留可回滚的 image tag（CI 天然满足：每次构建有不可变 tag）。
