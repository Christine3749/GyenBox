# GyenBox × HalfSphere 审计日志 (AUDIT-LOG)

> 约定:每次检测/审计在本文件**顶部**追加一节。每节头部固定包含 **日期 / 轮次 / Git commit**;最新在上。
> 所有结论以**审计当时的代码与数据库对象**为准,不假设历史报告仍然成立。

---

## R5 — 配额用量真相源修复(storageUsed 只增不减)

- **日期:** 2026-06-30
- **轮次:** R5
- **Git commit:** `8e6dad4` (branch `main`)
  - ⚠️ 本轮修复在未提交工作树中完成;范围为 `apps/web/lib/file-records.ts`、`apps/web/lib/membership.ts`、`apps/web/app/api/upload/{route,presign,complete}/route.ts`、`apps/web/app/api/files/[id]/route.ts`。
- **范围:** 修复 Web 上传配额闸门与回收站操作对 `User.storageUsed` 的不一致问题。
- **约束:** 未连接生产数据库;以代码审查、TypeScript 类型检查、Vitest 单测为验证。

### 结论
- 已确认旧逻辑存在两套用量真相源:会员/工作区展示按 `File` 未回收站聚合实时计算,上传配额闸门却读 `User.storageUsed` 缓存。
- 若文件被移动到回收站后缓存未回退,用户会看到容量已释放,但上传仍可能被 `QUOTA_EXCEEDED` 阻断。
- 已将上传预留、上传完成、旧 multipart 上传的配额投影改为读取活跃文件聚合值,避免历史脏缓存继续影响上传。
- 已在文件和文件夹进出回收站、DELETE 删除路径后同步刷新 `User.storageUsed` 缓存;文件夹回收站操作现在会对子树文件/文件夹做一致级联。

### 已验证
- `npm --workspace @gyenbox/web run typecheck` -> PASS。
- `npm --workspace @gyenbox/web run test` 首次在受限沙箱内因 `esbuild spawn EPERM` 失败;提权重跑后 PASS: 1 个测试文件,1 个测试通过。
- `git diff --check` 对本轮 Web 文件未发现空白错误。

### 后续建议
- 为配额投影与文件夹 trash/restore 级联补 API 层集成测试,覆盖“删除后可继续上传”和“恢复后容量回升”。
- 后续可考虑把 `User.storageUsed` 明确降级为缓存字段,定期或后台任务从 `File` 聚合值重建。

## R4 — 桌面同步链路可靠性整改复核(队列/上传/幂等/错误恢复)

- **日期:** 2026-06-28
- **轮次:** R4
- **Git commit:** `612702a` (branch `main`, "Release Explorer status fixes v0.1.15")
  - ⚠️ 本轮目标改动**全部在未提交工作树**:`apps/desktop/src/main/sync-engine.ts`、`apps/web/app/api/{upload/presign,upload/complete,folders}/route.ts`、`apps/web/lib/validations.ts`。本节以**工作树当前状态**为准。
- **范围:** 复核一份"桌面同步链路整改"报告所述 9 项"已完成优化"是否真实落地;不评估 R3 的 Cloud Files 占位符数据安全问题(不同轴,见下"未覆盖")。
- **约束:** 以代码核查为主;实跑桌面 typecheck;其余构建/测试命令为报告自陈,本轮未逐一复跑。

### 结论
- 报告所列 9 项优化均已按工作树代码逐条核实属实。
- R3 的 **P0-1(桌面 `tsc` 失败)已解除**:本轮实跑 `npm --workspace @gyenbox/desktop run typecheck` → **EXIT 0**。
- **方向正确**:相对路径去重、流式 hash/上传、写入中变化重排队、临时错误退避、删除防抖/移动复用、上传与文件夹幂等、统计去重,均为同步可靠性的正确加固。

### 已验证(实测,工作树)
- **相对路径去重**:同步队列以 `relativePath` 为 key——`this.queue.set(relativePath, reason)`([sync-engine.ts:225,293]),取代旧的绝对路径 key。
- **流式 hash + 流式上传**:`createHash("sha256")` + `createReadStream`([sync-engine.ts:1392-1394]);上传 body 用 `createReadStream(filePath) as BodyInit` + `duplex:"half"`([sync-engine.ts:865]),避免整文件入内存。
- **写入中变化保护**:`keepKnownUploadedIfUnchanged` 与 `sameMtime`(|Δmtime|<2ms)/size 比对([sync-engine.ts:304-328]);上传主流程也在 hash 后、上传前、上传后、complete 后多次 `assertFileUnchanged` 校验。
- **临时错误退避重试**:`MAX_TRANSIENT_RETRY_ATTEMPTS` + `retryDelayMs(attempt)` + `retryTimers/retryAttempts`([sync-engine.ts:49,405-425,1433]),轻微抖动不直接进 failed。
- **删除防抖 / 重启恢复 / 移动复用**:`deleteTimers` 防抖([sync-engine.ts:97,361-368]);重启 `queuePendingRemoteDeletes` 回放([sync-engine.ts:125,493-504]);移动检测跳过云删("Cloud delete skipped; item moved locally" [sync-engine.ts:640])。
- **`clientSource:"desktop-sync"` 契约**:`z.enum(["desktop-sync"]).optional()`([validations.ts:20,33,52]),presign 与 complete 均消费([presign/route.ts:75],[complete/route.ts:115])。
- **上传幂等(同目录同名复用)**:complete 在 `desktop-sync` 来源下按 `name+parentId` 找既有文件复用([complete/route.ts:115]);presign 同构([presign/route.ts:75]),避免重试产生重复文件。
- **文件夹创建幂等**:先校验父目录归属([folders/route.ts:56]),再复用同目录同名未删文件夹并直接返回([folders/route.ts:61]),桌面重试不再造重复文件夹。
- **queued/syncing 统计去重**:`summary()` 中 queued 只补 `memoryOnlyQueuedCount()`([sync-engine.ts:1184]),syncing 仅取 DB 状态、不再额外叠加 `processing`([sync-engine.ts:1185]);`memoryOnlyQueuedCount()` 会跳过 DB 已处于 queued/syncing 的路径([sync-engine.ts:1220]),避免同一任务在 DB 与内存队列重复计数。
- **桌面编译**:`npm --workspace @gyenbox/desktop run typecheck` → EXIT 0(解除 R3 P0-1)。

### 自陈、未逐一复跑
- **其余验证命令**(web typecheck / 桌面 build / `cargo check -p gyenbox-sync` / web vitest):报告自陈通过(含 Vitest 首跑被 esbuild 子进程 `spawn EPERM` 拦、提权后通过);本轮仅复跑桌面 typecheck,余者未复跑。

### 未覆盖(仍为开放项,非本轮范围)
- R3 **P0-2**(无常驻 Provider 却 `CfConvertToPlaceholder` → 脱水后文件可能不可用)与 **P0-3**(标准 3/4 需 Overlay Handler)属 Windows Cloud Files 数据安全/状态语义轴,**本轮整改未触及,仍开放**。
- 上传仍为整文件直传(流式但单请求),**分块/断点续传**未做;大文件中断仍整体失败。

### 建议
- 把本批工作树改动**提交**,使后续审计有稳定 commit 锚点(当前关键改动悬在未提交状态)。
- 为"统计去重"和"写入中变化重排队"补单元测试,固化回归。
- R3 P0-2/P0-3 仍是桌面端最高优先级数据安全问题,勿因本轮"同步更稳"而下调其优先级。

---

## R5 — 配额用量真相源修复(storageUsed 只增不减)

- **日期:** 2026-06-30
- **轮次:** R5
- **Git commit:** `8e6dad4` (branch `main`)
  - ⚠️ 本轮修复在未提交工作树中完成;范围为 `apps/web/lib/file-records.ts`、`apps/web/lib/membership.ts`、`apps/web/app/api/upload/{route,presign,complete}/route.ts`、`apps/web/app/api/files/[id]/route.ts`。
- **范围:** 修复 Web 上传配额闸门与回收站操作对 `User.storageUsed` 的不一致问题。
- **约束:** 未连接生产数据库;以代码审查、TypeScript 类型检查、Vitest 单测为验证。

### 结论
- 已确认旧逻辑存在两套用量真相源:会员/工作区展示按 `File` 未回收站聚合实时计算,上传配额闸门却读 `User.storageUsed` 缓存。
- 若文件被移动到回收站后缓存未回退,用户会看到容量已释放,但上传仍可能被 `QUOTA_EXCEEDED` 阻断。
- 已将上传预留、上传完成、旧 multipart 上传的配额投影改为读取活跃文件聚合值,避免历史脏缓存继续影响上传。
- 已在文件和文件夹进出回收站、DELETE 删除路径后同步刷新 `User.storageUsed` 缓存;文件夹回收站操作现在会对子树文件/文件夹做一致级联。

### 已验证
- `npm --workspace @gyenbox/web run typecheck` -> PASS。
- `npm --workspace @gyenbox/web run test` 首次在受限沙箱内因 `esbuild spawn EPERM` 失败;提权重跑后 PASS: 1 个测试文件,1 个测试通过。
- `git diff --check` 对本轮 Web 文件未发现空白错误。

### 后续建议
- 为配额投影与文件夹 trash/restore 级联补 API 层集成测试,覆盖“删除后可继续上传”和“恢复后容量回升”。
- 后续可考虑把 `User.storageUsed` 明确降级为缓存字段,定期或后台任务从 `File` 聚合值重建。

## R3 — 桌面 Explorer ✅ 状态架构审计(Windows Cloud Files)

- **日期:** 2026-06-27
- **轮次:** R3
- **Git commit:** `bd32d98` (branch `main`, "Release desktop sync fixes v0.1.14")
  - ⚠️ 工作树有 **4 个未提交改动**;`apps/desktop/src/main/main.ts` 等。本次以**工作树当前状态**为准。
- **范围:** `apps/desktop/src/main/{main.ts,cloud-files.ts,sync-engine.ts}`、`crates/gyenbox-sync/src/{cloud_files.rs,main.rs}`,对照用户提出的"可信 ✅ 状态系统"目标链路与 10 条验收标准。
- **约束:** 只读;未改代码;未构建发布;未动数据库。

### 结论
- 方向正确(已有 SQLite 真相源、父目录聚合、重启回放、根状态),但**当前工作树编译不过**,且**架构地基有数据安全隐患**。
- **最大风险:** ① 桌面端 `tsc` 失败;② 在无常驻 Provider 的情况下把真实文件转成 Cloud Files 占位符 → 脱水后可能打不开。
- **必须纠正的预期:** 验收标准 3(同步中)/4(异常)用 `CfSetInSyncState` 做不到(in-sync 是二元),需 Overlay Handler(0.1.18)。
- **最先该修:** 修编译 → 决策 Provider 模型 → 路线图把"常驻 Provider"前移。

### 已验证(实测)
- 链路:chokidar → `SyncEngine.upsertLocal`(SQLite)→ `onLocalStatus` → `markCloudFileStatus`([main.ts:102-104])→ cloud-files.ts **逐个 spawn** `gyenbox-sync.exe cloud-mark`([cloud-files.ts:153-179])→ Rust `CfConvertToPlaceholder(FORCE)+CfSetInSyncState+SHChangeNotify`([cloud_files.rs:85-103])。
- `cd apps/desktop && npx tsc --noEmit` → **4× `TS2304: Cannot find name 'cloudStatusReconcileTimer'`**;`scheduleCloudStatusReconciliation` 无调用点;`git diff HEAD` 确认为未提交改动引入(HEAD 能编)。
- `cargo build` 通过(Rust cloud_files OK)。
- `cloud_files.rs` 只有 `CfRegisterSyncRoot`,**无 `CfConnectSyncRoot`/回调** → placeholder 无 Provider 应答 hydration。
- 已存在(勿重复造):父目录聚合 `aggregateFolderStatuses`([main.ts:412-444])、Explorer 刷新 `SHChangeNotify`([cloud_files.rs:184-207])、重启回放 `applyKnownCloudFileStatuses`([main.ts:380])、重试退避 `drainStatusMarks`([cloud-files.ts:107-143])。

### P0
- **P0-1** 桌面端编译失败:`cloudStatusReconcileTimer` 未声明 + `scheduleCloudStatusReconciliation` 死代码([main.ts:372-378])。
- **P0-2** 无常驻 Provider 却 `CfConvertToPlaceholder`([cloud_files.rs:90,138-159])→ 系统脱水后文件可能不可用。**这是"常驻 Provider(原 0.1.17)"必须前移的根因**,不是优化。出路:A 做真 Provider(`CfConnectSyncRoot`+`FETCH_DATA`)或 B 不转 placeholder。
- **P0-3** 标准 3/4 无法用 `CfSetInSyncState`(二元 in-sync)实现([cloud_files.rs:121-136]),属 Overlay Handler(0.1.18)范畴。

### P1
- **P1-1** 父目录聚合不在实时路径,只在启动/换目录/reconcile 跑 → 文件夹最后一个子项传完不会立即变 ✅(标准 2)。
- **P1-2** 每次标记都 `FORCE` 转占位符(含 queued/syncing/failed)→ 抖动 + 放大 P0-2;应只转一次。
- **P1-3** per-file `spawn`(标准化性能问题,确认用户判断正确,与 P0-2 合并解决)。
- **P1-4** 断网恢复无自动矫正回路(reconcile 函数已坏)→ 标准 8 未达成。
- **P1-5** 只写不读 Explorer 状态,无一致性校验/诊断/修复按钮 → 标准 9/10 未达成。
- **P1-6** 重命名/移动遗留旧占位符元数据未回收(标准 5 隐患)。

### P2
- 启动时全表 per-file spawn 风暴([main.ts:380-402]);凭证仍明文存 `settings.json`(与 `desktop-auth-sync-architecture.md:276` 矛盾);Provider GUID 硬编码(正确,保持稳定)。

### 推荐架构(纠正版)
SQLite(唯一真相)→ **常驻 Rust Native Provider**(`CfRegisterSyncRoot`+`CfConnectSyncRoot`+`FETCH_DATA`,监听 DB、实时叶子→父→root 聚合、周期 reconcile+读回自修复、诊断接口)→ 分三出口:`CfSetInSyncState`(✅ 二元)/`SHChangeNotify`(刷新)/Overlay Handler(同步中·异常,标准 3/4)。Electron 只管 UI/登录/上传/写 SQLite。

### 路线图修正
- **0.1.15:** 修编译 + 父目录聚合移入实时路径 + 占位符只转一次 + 只读诊断。
- **0.1.16:** 周期/断网恢复矫正回路 + "Repair Explorer status" 按钮。
- **0.1.17（前移为前置必做）:** 常驻 Provider + `CfConnectSyncRoot`+`FETCH_DATA`,去掉 per-file spawn(解 P0-2 + P1-3）。
- **0.1.18:** Overlay Handler（标准 3/4），注意 ~15 槽限制与 OneDrive/Dropbox 抢占。

---

## R5 — 配额用量真相源修复(storageUsed 只增不减)

- **日期:** 2026-06-30
- **轮次:** R5
- **Git commit:** `8e6dad4` (branch `main`)
  - ⚠️ 本轮修复在未提交工作树中完成;范围为 `apps/web/lib/file-records.ts`、`apps/web/lib/membership.ts`、`apps/web/app/api/upload/{route,presign,complete}/route.ts`、`apps/web/app/api/files/[id]/route.ts`。
- **范围:** 修复 Web 上传配额闸门与回收站操作对 `User.storageUsed` 的不一致问题。
- **约束:** 未连接生产数据库;以代码审查、TypeScript 类型检查、Vitest 单测为验证。

### 结论
- 已确认旧逻辑存在两套用量真相源:会员/工作区展示按 `File` 未回收站聚合实时计算,上传配额闸门却读 `User.storageUsed` 缓存。
- 若文件被移动到回收站后缓存未回退,用户会看到容量已释放,但上传仍可能被 `QUOTA_EXCEEDED` 阻断。
- 已将上传预留、上传完成、旧 multipart 上传的配额投影改为读取活跃文件聚合值,避免历史脏缓存继续影响上传。
- 已在文件和文件夹进出回收站、DELETE 删除路径后同步刷新 `User.storageUsed` 缓存;文件夹回收站操作现在会对子树文件/文件夹做一致级联。

### 已验证
- `npm --workspace @gyenbox/web run typecheck` -> PASS。
- `npm --workspace @gyenbox/web run test` 首次在受限沙箱内因 `esbuild spawn EPERM` 失败;提权重跑后 PASS: 1 个测试文件,1 个测试通过。
- `git diff --check` 对本轮 Web 文件未发现空白错误。

### 后续建议
- 为配额投影与文件夹 trash/restore 级联补 API 层集成测试,覆盖“删除后可继续上传”和“恢复后容量回升”。
- 后续可考虑把 `User.storageUsed` 明确降级为缓存字段,定期或后台任务从 `File` 聚合值重建。

## R2 — 会员 / 权限架构审计(代码 + 数据库)

- **日期:** 2026-06-27
- **轮次:** R2
- **Git commit:** `00c86ac` (branch `main`, "Refine desktop sync panel")
  - ⚠️ 工作区有 **23 个未提交改动**;会员相关文件(`apps/web/lib/membership.ts`、`apps/web/app/api/membership/`、`packages/db/prisma/*`、`docs/sql/*` 等)**尚未提交**。本次审计针对**工作区当前状态**,而非 `00c86ac` 本身。
- **范围:** HalfSphere 中央会员 × GyenBox。`membership.ts` / `api/membership/route.ts` / billing panel / `packages/db/prisma/schema.prisma` + `migrations` / `docs/sql/halfsphere-central-membership.sql` / 线上 Supabase `hrtynofmjcumuanjvpxz` 只读核对。
- **约束:** 只读;无代码改动;无部署;未执行 `migrate reset` / `db push` / 任何破坏性 SQL。

### 结论
- **当前是否可用:不可用。**
- **最大风险:** `hs_*` 表未对数据库角色做 `GRANT`。代码已改为以 **authenticated 用户身份(用户 JWT)** 走 PostgREST 读 `hs_membership_plans / hs_subscriptions`;实测 `anon` 被拒(`42501 permission denied`),`authenticated` 极可能同样被拒 → `/api/membership` 503。
- **最先该修:** 给 `hs_*` 补 `GRANT`(加性、非破坏)→ 用真实登录用户验证 `/api/membership` 返 200 → 清理 Prisma 里的 Design A 死 schema + 迁移地雷。

### 已验证(实测,以当前为准)
- 代码已从"Prisma 原始 SQL 查 hs_"改写为 **supabase-js + 用户 JWT**:`getHsClient` 注入 `Authorization: Bearer <accessToken>`([membership.ts:82-91]);GET/POST 从请求头取 token,缺失则 401([api/membership/route.ts:12-13,28-29])。会员读取走 RLS,写入走 RPC `hs_activate_free_membership`——架构方向正确。
- `getStorageUsed` / `syncLegacyQuota` 仍用 Prisma(`DATABASE_URL`),但 `getStorageUsed` 自带 try/catch 返 0n → **`DATABASE_URL` 不再是会员接口的阻断项**(与 R1 结论不同)。
- 线上库(anon 只读 PostgREST):`hs_membership_plans` / `hs_products` / `hs_subscriptions` 全部 `HTTP 401 / 42501 permission denied`;RPC `hs_activate_free_membership` 对 anon `42501`(预期,SQL 只 grant 给 authenticated);`hs_*` 对象**均存在**;Design A 表 `MembershipPlan` `HTTP 404`(**线上从未建过**)。
- Prisma schema 仍声明 Design A 模型 `MembershipPlan/Subscription/Event`([schema.prisma:167/185/209]),应用代码**零引用**(grep 确认)→ 死代码。`migrations/20260627012000_membership_system/` + `migration_lock.toml` 均在。
- `.env.local` 仅 `SUPABASE_URL/ANON_KEY`,**无 `DATABASE_URL`**;仓库内**未发现** service_role key / 数据库密码泄露;RPC 为 `security definer set search_path = public`,`revoke ... from public` + `grant execute ... to authenticated`(search_path 已锁定)。
- `apps/web` 类型检查通过。

### 无法验证(缺凭证)
- `authenticated` 角色对 `hs_*` 是否有 `SELECT`(无用户 JWT、无 service 角色、无 SQL Editor 权限)。`anon` 被拒已证实;Supabase 默认授权对 anon/authenticated 成对发放,故 authenticated 极可能同样被拒,但**未证实**。
- `hs_*` 的 RLS 是否真的 `enabled`(SQL 写了 `enable row level security`,无法以 anon 自查 `pg_class`)。
- 生产环境是否已设 `DATABASE_URL`,以及它指向 Cloud SQL 还是 Supabase(仅查了本机 `.env.local`)。
> 判定"能否立即可用"的决定性证据 = 下方只读 SQL 第 1、5 项。

### P0 阻断
- **P0-1 `hs_*` 缺 GRANT → 登录用户读不到会员 → 503。** 证据见上(SQL 全文无 `grant select on ... to` + anon 实测 42501)。修复:`grant select` products/plans→anon+authenticated、subscriptions/events/profiles/view→authenticated(先确认 RLS 已开)。
- **P0-2 两套 schema 并存 + 迁移地雷已上膛。** Design A 在 Prisma schema/migration 里仍活但线上不存在、应用不用;基础 schema 无迁移;`migration_lock.toml` 已就位。跑 `npm run db:migrate`/`migrate deploy` 会建废表并因引用不存在的 `User/Plan` 失败 / drift / 潜在 reset。修复:删 Design A 模型、隔离该迁移、为基础 schema 补 `--from-empty` 初始迁移(本轮**不执行**)。

### P1 正确性
- **P1-1** 本机无 `DATABASE_URL` → 容量恒显示 0、`syncLegacyQuota` 静默失败;GyenBox 文件/上传仍依赖它。
- **P1-2** RPC `hs_activate_free_membership` 接受**任意 `product_code`**,无白名单/权限校验 → 任一登录用户可自助开通任意产品免费会员([sql:205-252])。
- **P1-3** RPC 内会员事件**无条件插入**([sql:233-243]) → 订阅被跳过时仍写"已激活"事件。
- **P1-4** `syncLegacyQuota` 把 hs 套餐码 `.toUpperCase() as never` 强转 `Plan` 枚举;非枚举码抛错(被吞);且不再 `ensureUserRecord`,用户行不存在则 no-op。
- **P1-5** 会员限额(容量/设备/单文件)**无处强制**:上传仍用 `MAX_UPLOAD_BYTES`,不读 `hs_membership_plans`,不更新 `storageUsed`。
- **P1-6** `hs_*` 写操作无 RLS policy,靠 RPC(设计正确);但**补 GRANT 前必须确认 RLS 已启用**,否则越权。

### P2 清理 / 文档
- **P2-1** `docs/membership-system.md:44-45` 让人粘贴 Design A 迁移 SQL(错文件),应指向 `docs/sql/halfsphere-central-membership.sql`。
- **P2-2** `membership.ts:36` / `supabase-server.ts:6` 硬编码 Supabase URL 兜底(公开值,非密钥,但耦合)。
- **P2-3** `findHsSubscription` 两次往返(订阅→按 plan_id 查套餐),可合并。
- **P2-4** Design A 三个 Prisma 模型为死代码(随 P0-2 清理)。

### 推荐最终架构(摘要)
HS Auth(`auth.users` 唯一身份)→ HS Membership(`hs_*` 中央库,按 `product_code` 切分,RLS 只读自己,写走 security-definer RPC,以 authenticated + RLS 读)→ GyenBox/GSYEN 对会员无状态:每请求校验 JWT、向 HS 查本产品订阅、推导并**强制**限额;各产品只拥有自己的文件元数据(`DATABASE_URL`)+ 字节(GCS),用 `auth.uid()` 串联。

### 附:只读验证 SQL(Supabase SQL Editor 运行,均只读)
```sql
-- 1) anon/authenticated 对 hs_ 表的表级授权(P0-1 决定性证据)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name like 'hs\_%'
order by table_name, grantee;

-- 2) RLS 策略
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public' and tablename like 'hs\_%'
order by tablename, policyname;

-- 3) RPC:security definer + search_path
select p.proname, p.prosecdef as security_definer, p.proconfig as settings,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='hs_activate_free_membership';

-- 4) 函数执行授权
select grantee, privilege_type from information_schema.role_routine_grants
where routine_schema='public' and routine_name='hs_activate_free_membership';

-- 5) RLS 是否启用
select relname, relrowsecurity, relforcerowsecurity
from pg_class where relnamespace='public'::regnamespace and relname like 'hs\_%';

-- 6) 套餐种子
select product_code, code, storage_quota_bytes, is_active
from public.hs_membership_plans order by product_code, sort_order;
```

---

## R5 — 配额用量真相源修复(storageUsed 只增不减)

- **日期:** 2026-06-30
- **轮次:** R5
- **Git commit:** `8e6dad4` (branch `main`)
  - ⚠️ 本轮修复在未提交工作树中完成;范围为 `apps/web/lib/file-records.ts`、`apps/web/lib/membership.ts`、`apps/web/app/api/upload/{route,presign,complete}/route.ts`、`apps/web/app/api/files/[id]/route.ts`。
- **范围:** 修复 Web 上传配额闸门与回收站操作对 `User.storageUsed` 的不一致问题。
- **约束:** 未连接生产数据库;以代码审查、TypeScript 类型检查、Vitest 单测为验证。

### 结论
- 已确认旧逻辑存在两套用量真相源:会员/工作区展示按 `File` 未回收站聚合实时计算,上传配额闸门却读 `User.storageUsed` 缓存。
- 若文件被移动到回收站后缓存未回退,用户会看到容量已释放,但上传仍可能被 `QUOTA_EXCEEDED` 阻断。
- 已将上传预留、上传完成、旧 multipart 上传的配额投影改为读取活跃文件聚合值,避免历史脏缓存继续影响上传。
- 已在文件和文件夹进出回收站、DELETE 删除路径后同步刷新 `User.storageUsed` 缓存;文件夹回收站操作现在会对子树文件/文件夹做一致级联。

### 已验证
- `npm --workspace @gyenbox/web run typecheck` -> PASS。
- `npm --workspace @gyenbox/web run test` 首次在受限沙箱内因 `esbuild spawn EPERM` 失败;提权重跑后 PASS: 1 个测试文件,1 个测试通过。
- `git diff --check` 对本轮 Web 文件未发现空白错误。

### 后续建议
- 为配额投影与文件夹 trash/restore 级联补 API 层集成测试,覆盖“删除后可继续上传”和“恢复后容量回升”。
- 后续可考虑把 `User.storageUsed` 明确降级为缓存字段,定期或后台任务从 `File` 聚合值重建。

<!--
追加新审计时,复制下面模板到本文件**顶部**(R2 之上):

## R{N} — {标题}
- **日期:** YYYY-MM-DD
- **轮次:** R{N}
- **Git commit:** `{short}` (branch `{branch}`)  ⚠️ 如有未提交改动请注明
- **范围:** ...
- **约束:** ...
### 结论 / 已验证 / 无法验证 / P0 / P1 / P2 / 只读SQL
-->
