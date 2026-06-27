# GyenBox × HalfSphere 审计日志 (AUDIT-LOG)

> 约定:每次检测/审计在本文件**顶部**追加一节。每节头部固定包含 **日期 / 轮次 / Git commit**;最新在上。
> 所有结论以**审计当时的代码与数据库对象**为准,不假设历史报告仍然成立。

---

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
