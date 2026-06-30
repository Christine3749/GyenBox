# GyenBox 代码库报告说明（第一阶段）

> 范围：第一阶段已落地的全部代码——Web、Desktop、Rust 同步层、共享包与数据模型。
> 用途：阶段总结 + Android 第二阶段的参照底座。
> 版本基线：monorepo `0.1.19`；API 契约 `0.1.17`；Rust core `0.1.20`。
> 编写日期：2026-06-28

---

## 1. 概览

GyenBox 是一套**隐私优先的云存储**产品，采用 **monorepo**（npm workspaces + Turbo）。第一阶段交付三个客户端面 + 一套后端 API + 共享基础包。

```
GyenBox monorepo
├── apps/web        Next.js 14 — Web 应用 + 全部后端 API（API 即在 web 内）
├── apps/desktop    Electron 42 — Windows 桌面同步客户端
├── crates/         Rust — Windows Cloud Files 同步层（gyenbox-sync）
└── packages/       共享包：db(Prisma) · types · api-client(OpenAPI)
```

### 技术栈总表

| 面 | 技术 | 版本 | 说明 |
|---|---|---|---|
| Web/UI | Next.js (App Router) + React | 14.2.35 / 18.3 | SSR + API Routes 一体 |
| Web/样式 | Tailwind + Radix + lucide + motion | — | 设计系统在 `components/ui` |
| 认证 | NextAuth + Supabase | next-auth / supabase-js 2.108 | 详见 §6 |
| 数据库 | Prisma + PostgreSQL | Prisma 6.19 | schema 见 `packages/db` |
| 对象存储 | Google Cloud Storage（主）+ AWS S3（备用 lib） | @google-cloud/storage, @aws-sdk | 直传签名 URL |
| 校验/工具 | zod, bcryptjs, nanoid, sharp, jszip, date-fns | — | sharp 做缩略图 |
| Desktop | Electron + chokidar | 42.5 / builder 26 | 托盘 + 本地监听 |
| Sync Core | Rust (edition 2024) | 0.1.20 | windows / windows-sys |
| 构建编排 | Turbo | 2.8 | `turbo dev/build/lint/typecheck/test` |

---

## 2. 仓库结构

```
apps/web/
  app/
    (auth)/         login · signup · verify
    (dashboard)/    home · files · search · settings · shared · starred · trash
    api/            ← 全部后端 API（见 §4）
    desktop/authorize   桌面/移动授权页（深链发起处）
    request/[token]     文件请求（向你收文件）
    share/[token]       分享访问页
    workspace/          工作区
  components/        brand · files · gyenbox · layout · share · ui · upload
  lib/              ← 业务核心库（见 §4.3）

apps/desktop/src/
  main/            Electron 主进程（同步引擎、IPC、深链、托盘、Windows 集成）
  preload/         preload.ts 暴露受控 IPC
  renderer/        面板 UI（index.html / renderer.js / styles.css）

crates/gyenbox-sync/src/   Rust 同步层（见 §5）

packages/
  db/        Prisma schema + 生成的 client
  types/     共享 TS 类型（src/index.ts）
  api-client/  OpenAPI 契约（openapi/gyenbox.openapi.yaml）+ src
```

---

## 3. 数据模型（`packages/db/prisma/schema.prisma`，PostgreSQL）

实体分四组：

**身份与认证**
- `User` — 账户主体；含 `storageUsed` / `storageQuota`（默认 10 GiB）/ `plan` / `passwordHash` / `twoFactorEnabled`。
- `Account` / `Session` / `VerificationToken` — NextAuth 标准三件套（OAuth token、会话、邮箱验证）。`Session` 额外带 `ipAddress`/`userAgent`/`revokedAt`，支持设备/会话治理。

**文件系统（核心）**
- `File` — `storageKey`（对象存储键）、`checksum`、`mimeType`、`size`、`parentId`(→Folder)、`isStarred`/`isTrashed`/`trashedAt`(软删除)、`isEncrypted`、`thumbnailKey`。
- `Folder` — 自引用树（`FolderTree`）、软删除同构。
- `FileVersion` — 版本历史（`versionNumber` 唯一、各版本独立 `storageKey`）。
- 索引：`(ownerId,parentId)`、`(workspaceId)`、`(isTrashed,trashedAt)` —— 目录列举与回收站查询走索引。

**协作与分享**
- `Share` — 公开链接（`token` 唯一、`permission` VIEW/COMMENT/EDIT、`passwordHash`、`expiresAt`、`accessCount`），可挂 File 或 Folder。
- `Workspace` / `WorkspaceMember`（角色 OWNER/ADMIN/MEMBER/GUEST）、`Comment`（线程）、`Tag`、`Activity`（资源动态）。

**会员与审计**
- `MembershipPlan` / `MembershipSubscription` / `MembershipEvent` — 套餐(FREE/PLUS/PROFESSIONAL/BUSINESS)、订阅状态、计费周期(月/年/终身)、provider(MANUAL/STRIPE/APP_STORE/PLAY_STORE/PROMO)、配额/最大文件/AI 额度/设备数。
- `AuditLog` / `Notification` — 审计与通知。

> ⚠️ **对 Android 关键**：`File`/`Folder` 用 `cuid` 主键 + `updatedAt` + `trashedAt` 软删除，**已具备做"变更游标"的数据基础**，但目前**没有暴露增量查询的 API**（见 §10）。

---

## 4. Web 应用（`apps/web`）

Web 既是用户界面，也是**唯一的后端**——所有 API 以 Next.js Route Handlers 形式落在 `app/api`。

### 4.1 页面

- `(auth)`：login / signup / verify。
- `(dashboard)`：home / files / search / settings / shared / starred / trash —— 完整网盘界面。
- `desktop/authorize`：桌面（及未来移动）授权发起页，产出 `gyenbox://auth/callback` 深链。
- `share/[token]`、`request/[token]`、`workspace`：对外分享、收件请求、工作区。

### 4.2 API 路由（`app/api/*/route.ts`）

| 路由 | 方法 | 职责 |
|---|---|---|
| `auth/[...nextauth]` | * | NextAuth 入口 |
| `files` | GET/POST | 列目录 / 创建 |
| `files/[id]` | GET/DELETE/… | 单文件读取、删除（软删/回收站） |
| `folders` | POST | 建文件夹 |
| `upload/presign` | POST | 上传预签名（配额/权限校验 + GCS 签名 URL） |
| `upload/complete` | POST | 上传完成落库 |
| `download/[id]` | GET | 下载 |
| `shares` / `share/[token]/download` | POST/GET | 建分享 / 凭 token 下载 |
| `search` | GET | 搜索 |
| `membership` | GET | 会员/权益查询（对接 HalfSphere） |
| `desktop/session/refresh` | POST | 桌面会话刷新（refreshToken → 新 token） |
| `releases/desktop/windows` | GET | 桌面更新分发 |
| `webhooks` | POST | 外部回调 |

### 4.3 业务核心库（`apps/web/lib`）

- `prisma.ts`：Prisma client 单例。
- `auth.ts`：NextAuth 配置（`@auth/prisma-adapter` + bcryptjs 密码）。
- `supabase-server.ts` / `supabase-client.ts` / `supabase-public-config.ts`：Supabase（HalfSphere 会员权威）接入。
- `membership.ts`：会员/权益解析。
- `ownership.ts`：`requireActor()` —— 所有受保护路由的统一身份/归属校验入口。
- `upload-policy.ts`：权益驱动的上传策略（`planAllowsUploads` / `getMaxUploadBytes` / `getStorageQuotaBytes` / `normalizeUploadParentId`）。
- `gcs.ts` / `s3.ts`：对象存储（GCS 为主、S3 备用），`createSignedUploadUrl` / `createStorageKey`。
- `file-records.ts`：`ensureUserRecord` 等落库辅助。
- `validations.ts`：zod schema（如 `uploadReservationSchema`）。
- `api-response.ts`：统一 `ok()` / `fail(code,msg,status,detail)` 信封。
- 其余：`crypto.ts`(+test)、`search.ts`、`format.ts`、`utils.ts`、`mock-data.ts`。

### 4.4 关键流程：上传（三段式，`upload/presign/route.ts`）

```
1) POST /api/upload/presign
   requireActor → zod 校验 → readUploadEntitlements（权益）
   → planAllowsUploads / maxUploadBytes / 配额投影检查
   → 校验目标 folder 归属；desktop-sync 来源按 (name,parentId) 找既有文件做覆盖
   → createStorageKey + createSignedUploadUrl(GCS, 900s)
   → 返回 {uploadId, fileId, bucket, storageKey, uploadUrl, method:PUT, headers, expiresIn}
2) PUT <uploadUrl>     客户端直传对象存储（不经 web 服务器）
3) POST /api/upload/complete   落库 File 记录，返回 {file:{id,name}}
```

要点：**配额与权益在 presign 阶段前置拦截**；大文件直传走签名 URL **绕过应用服务器**；`clientSource:"desktop-sync"` 触发"按名覆盖"语义（同步幂等）。统一错误码：`VALIDATION_ERROR/PLAN_RESTRICTED/QUOTA_EXCEEDED/FORBIDDEN/PRESIGN_FAILED`。

---

## 5. Desktop 应用（`apps/desktop`，Electron 42 + Windows）

Dropbox 式托盘客户端，定位"小而稳"。架构分三段：**Electron 主进程（TS）+ 渲染面板 + Rust Windows 集成层**。

### 5.1 主进程模块（`src/main`）

| 文件 | 行数 | 职责 |
|---|---|---|
| `main.ts` | 846 | 应用生命周期、托盘、深链协议、IPC、窗口 |
| `sync-engine.ts` | 1491 | **同步大脑**：扫描/哈希/上传队列/folder mapping/会话刷新/活动日志 |
| `folder-status.ts` | 215 | 目录聚合状态（rollup） |
| `cloud-files.ts` | 202 | 调 Rust core 做 Windows Cloud Files 标记 |
| `cloud-provider-process.ts` | 139 | Cloud Provider 子进程管理 |
| `sync-core-process.ts` | 65 | spawn Rust 二进制、解析其 JSON 事件流 |
| `sync-schema.ts` | 39 | 本地 SQLite 表（`local_files`/`sync_activity`/`folder_rollup`） |
| `sync-types.ts` | 77 | 同步相关 TS 类型 + API 响应形状 |
| `settings-store.ts` | 165 | 设置/凭据持久化 |
| `mime.ts` / `types.ts` | — | 辅助 |

### 5.2 同步引擎（`sync-engine.ts`）

- **本地索引**：`node:sqlite`（Node 内置），表见 `sync-schema.ts`——`local_files`（relativePath 主键、size/mtime/hash/status/remoteId）、`sync_activity`、`folder_rollup`（0.1.16 起增量维护目录计数，改一个叶子只触及祖先链，不全表重算）。
- **变更检测**：`chokidar` 监听根目录文件 create/change。
- **状态机**：`QueueReason: created|changed|deleted|rescan|retry`；`FileStatus: queued→syncing→uploaded | failed | deleted | skipped`。
- **上传**：复用 web 三段式（presign→PUT→complete），`SHA-256` 先算后传。
- **会话**：`POST /api/desktop/session/refresh` 自动续期（refreshToken 变化触发）。

### 5.3 深链认证（`main.ts`）

```
注册协议：app.setAsDefaultProtocolClient("gyenbox")
捕获深链：app.on("open-url") + app.on("second-instance")（Windows 走命令行参数）
解析：argv.find(v => v.startsWith("gyenbox://auth/callback"))
来源：web /desktop/authorize 用户登录 HalfSphere 后构造该深链回跳
```

### 5.4 IPC 面（preload 暴露）

`desktop:getSnapshot / togglePaused / rescan / retryFailed / repairExplorerStatus / openFolder / openWeb / openSignIn / signOut / chooseFolder / getAppVersion / quit`——渲染层只能通过这些受控通道操作主进程。

---

## 6. 认证与会员模型（双轨）

GyenBox 同时用两套，分工明确：

- **NextAuth + Prisma**：Web 自身的登录会话（`Account`/`Session`/`User.passwordHash`，bcryptjs），处理 OAuth / 邮箱密码 / 2FA 字段。
- **HalfSphere（Supabase, 项目 `hrtynofmjcumuanjvpxz`）**：**中央会员权威**。GyenBox 查询它判定权益，本地不留会员真相（见 `/api/membership`、`lib/membership.ts`、`lib/supabase-*.ts`）。
- **桌面/移动**：用 Supabase access/refresh token，经 `gyenbox://auth/callback` 深链交付，`desktop/session/refresh` 续期。

> Android 认证应沿用此形态：Custom Tabs 打开授权页 → HalfSphere 登录 → App Links 回跳带 token。

---

## 7. Rust 同步层（`crates/gyenbox-sync`，0.1.20）

**职责定位需澄清**：这不是可移植同步引擎，而是 **Windows Cloud Files API 集成层**（在资源管理器里显示云状态徽标、占位文件、按需水合）。

- 依赖仅 `windows` / `windows-sys`（Win32 CloudFilters / Shell / Storage_Provider）。
- 1805 行中约 **1368 行是 Windows 专用**：`cloud_files.rs`(564)、`cloud_provider.rs`(585)、`shell_sync_root.rs`(219)。
- 可移植的逻辑很薄：`db.rs`(27)、`scanner.rs`(53)、`hasher.rs`(22)、`queue.rs`(22)、`watcher.rs`(54)。
- **CLI 子命令**（被 Electron spawn 调用）：`cloud-register` / `cloud-unregister-id` / `cloud-mark[-root|-connected]` / `cloud-provider-run` / `cloud-provider-spike` / `cloud-diagnose`；默认模式跑一次扫描，`--watch` 进循环；以 **JSON 行事件**（`Ready`/`ScanDone` 等）回传给主进程。
- 配置走环境变量：`GYENBOX_SYNC_FOLDER` / `GYENBOX_STATE_FOLDER`。

> 含义：真正的"同步算法"在 `sync-engine.ts`（TS），Rust 只管 Windows 外壳集成。**Android 无法直接复用本 crate**（详见 `android-architecture.md` §3）。

---

## 8. 共享包

- `packages/db`：Prisma schema（§3）+ 生成 client；`db:generate` / `db:migrate`。多 `binaryTargets`（native + RHEL/musl OpenSSL 3）适配容器部署。
- `packages/types`：单文件 `src/index.ts` 共享类型。
- `packages/api-client`：`openapi/gyenbox.openapi.yaml`（3.1，当前仅覆盖 files/folders/shares/search 四类，**滞后于实际路由**）+ `src/index.ts` 客户端。

---

## 9. 端到端流程小结

```
[桌面授权]
desktop → 打开 web /desktop/authorize?state&deviceName&appVersion
        → 用户登录 HalfSphere(Supabase)
        → web 构造 gyenbox://auth/callback?state&access_token&refresh_token&expires_at&email
        → 桌面捕获深链 → settings-store 落库 → sync-engine 启动

[文件上传（桌面或 web 同源）]
chokidar 发现变更 → SHA-256 → POST /api/upload/presign（权益+配额校验）
  → PUT 直传 GCS → POST /api/upload/complete（落库 File）
  → Rust core cloud-mark 更新资源管理器徽标
```

---

## 10. 已知限制与技术债

来自桌面 README 自陈 + 本次代码核查：

1. **无云→本地下载 / 无变更游标 API**：桌面目前以上传为主；后端没有"自 cursor 起的增量变更"端点。→ **双向同步（桌面 MVP2 与 Android v1）的共同硬阻塞**。
2. **桌面 token 仍可手填**，嵌套文件夹检测到但映射未全。
3. **整文件上传**，无分块/断点续传。
4. **资源管理器右键菜单未实现**（仅徽标）。
5. **OpenAPI 契约滞后**：`gyenbox.openapi.yaml` 只描述 4 类端点，缺 upload/download/desktop/membership 等实际路由——建议补齐，作为 Android API client 的权威来源。
6. **同步算法单点在 TS**：未来多端（Android/iOS）会产生重复实现风险，需"语言无关同步规格 + 测试向量"防漂移（见 `android-architecture.md` §3）。
7. **存储双后端（GCS+S3）**：当前以 GCS 为主，S3 lib 并存，需明确切换/选择策略。

---

## 11. 相关文档

- `docs/android-architecture.md` — 第二阶段 Android 架构与选型。
- `docs/desktop-auth-sync-architecture.md` / `docs/desktop-sync-provider-design.md` — 桌面同步设计。
- `docs/AUDIT-LOG.md` — 审计日志（单一日志，最新在上）。
- `apps/desktop/README.md` — 桌面 MVP 现状与后续 MVP2/3 规划。
