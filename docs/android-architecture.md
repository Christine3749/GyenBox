# GyenBox Android 客户端 — 技术架构与选型

> 第二阶段开篇文档。目标：**完整双向同步客户端**，技术栈 **Native Kotlin + Jetpack Compose**。
> 本文是架构与选型决策，不含 UI 视觉稿（见 `android-bottom-nav-reference.svg` 的既定基调）。
> 状态：草案 · 待评审

---

## 0. TL;DR

- **技术栈**：Kotlin + Jetpack Compose + Room + WorkManager + OkHttp/Ktor。原生方案，理由见 §2。
- **同步引擎**：v1 用 **Kotlin 原生引擎**，对照移植 `apps/desktop/src/main/sync-engine.ts` 的算法。**不阻塞于 Rust 核心提取**（见 §3 的现实校准）。
- **两个硬前提**（必须先于 Android 双向同步落地）：
  1. 后端缺**变更游标 / 增量 API**（"拉取云端自 cursor 以来的变更"），双向同步的"下行"半边无法实现。见 §6。
  2. 后端缺**稳定的文件下载直链**约定（按需下载所必需）。见 §6。
- **范围校准**：手机端"双向同步" = **选择性同步 + 相册自动上传 + 按需下载 + 本地变更回传**，**不是**桌面那种整盘文件夹镜像。见 §4。

---

## 1. 现状盘点（第一阶段产物）

| 组件 | 位置 | 形态 | 对 Android 的意义 |
|---|---|---|---|
| Web | `apps/web` (Next.js) | auth / dashboard / workspace / share / request | 提供 API 与 `/desktop/authorize` 授权页，可复用于移动授权 |
| Desktop | `apps/desktop` (Electron, Windows) | 托盘同步、SQLite 索引、上传队列 | **同步算法的事实参考实现**（`sync-engine.ts`） |
| Sync Core | `crates/gyenbox-sync` (Rust) | **Windows Cloud Files API 胶水** | ⚠️ 几乎不可移植，见 §3 |
| 会员中心 | HalfSphere (Supabase) | 中央会员权威 | Android 认证同样走 HalfSphere，本地不留权威 |

### 现有 API 契约（实际在用）

```
GET    /api/files?folderId&sort&order        列目录
POST   /api/upload/presign                    上传预签名 -> {uploadId,fileId,bucket,storageKey,uploadUrl,method:PUT,headers,expiresIn}
PUT    <uploadUrl>                             直传对象存储
POST   /api/upload/complete                    完成 -> {file:{id,name}}
POST   /api/folders                            建文件夹
DELETE /api/files/{id}                         删除/回收站
POST   /api/shares                             分享链接
GET    /api/search                             搜索
POST   /api/desktop/session/refresh           刷新会话 -> {accessToken,refreshToken,expiresAt,user}
```

### 认证流程（桌面端现行，Android 可直接复用形态）

```
App 打开 Custom Tab -> web /desktop/authorize?state&deviceName&appVersion
  -> 用户登录 HalfSphere (Supabase)
  -> web 构造深链 gyenbox://auth/callback?state&access_token&refresh_token&expires_at&email
  -> App 捕获深链，落库 token
后续：POST /api/desktop/session/refresh { refreshToken } 续期
```

---

## 2. 选型：为什么 Native Kotlin + Compose

文件同步类 App 的重点全在**系统集成**，而非界面渲染，原生方案在这些点上无需绕路：

| 需求 | 原生支持 | 跨平台（Flutter/RN）代价 |
|---|---|---|
| 后台/定时同步 | WorkManager、前台服务 | 需 platform channel 包装 |
| 文件存取 | Storage Access Framework、MediaStore | 插件覆盖不全，相册元数据易丢 |
| 相册自动上传 | MediaStore 增量查询 + observer | 同上 |
| Doze / 省电适配 | 直接对接系统 API | 间接、不可控 |
| 大文件直传 | OkHttp/Ktor 流式 PUT | 桥接层内存拷贝风险 |
| 安全凭据存储 | Keystore + EncryptedSharedPreferences | 依赖第三方插件 |

**结论**：Compose 做 UI（与 `android-bottom-nav-reference.svg` 的 4-Tab 深色基调一致），其余全原生。

### 技术栈清单

- UI：Jetpack Compose + Material 3（深色主题，主色 `#7C6AF7`）
- 导航：Navigation-Compose，底部 4 Tab：Home / Files / Shared / Settings
- DI：Hilt
- 异步：Coroutines + Flow
- 本地库：Room（镜像 `sync-schema.ts`）
- 后台任务：WorkManager（上传/下载/同步），长任务用前台服务 + 通知
- 网络：OkHttp + Retrofit（或 Ktor Client），kotlinx.serialization
- 认证：Custom Tabs + App Links + Supabase token，Keystore 加密存储
- 哈希：原生 `MessageDigest`(SHA-256)，与桌面端一致

---

## 3. 共享核心策略（关键决策）

### 现实校准

`crates/gyenbox-sync` **不是**可复用的同步引擎，而是 Windows Cloud Files 集成层。真正可移植的"同步大脑"（变更检测、上传/下载状态机、folder mapping、冲突处理）目前以 **TypeScript** 形式存在于 `sync-engine.ts`。因此**没有现成的 Rust 核心可以编进 Android**。

### 两条路线

**路线 A（推荐，v1 采用）— Kotlin 原生引擎**
- 在 Android 内用 Kotlin 重写同步引擎，**对照 `sync-engine.ts` 逐段移植算法**（状态机、队列、folder mapping 与桌面端保持语义一致）。
- 优点：最快落地、无 FFI/构建复杂度、与 Compose/WorkManager 天然贴合。
- 代价：同步算法出现"第二份实现"（TS + Kotlin），需靠**共享测试向量**防止两端行为漂移。

**路线 B（收敛，后置）— 提取真正可移植的 Rust 核心 `gyenbox-core`**
- 新建一个**无 Windows 依赖**的 Rust crate：仅含 API 客户端 + 索引 schema + reconciliation 状态机，经 **UniFFI** 同时供 Desktop 与 Android 调用。
- 这是"一套核心多端共用"的理想态，但属于**净新增工作**（把 TS 算法移植成 Rust），价值在于消除多端漂移。
- **触发条件**：当出现第 3 个客户端（如 iOS），或两端行为漂移成为实际维护痛点时再启动。**不应阻塞 Android v1**。

> 决策：**v1 走路线 A**。把"算法语义"沉淀为一份**语言无关的同步规格 + 测试向量**（`docs/sync-spec.md` + JSON fixtures），让未来收敛到路线 B 时有据可依。

---

## 4. 范围定义：手机端的"双向同步"是什么

桌面端是"本地文件夹 ↔ 云"的整盘镜像。手机端受 SAF / 后台执行 / 存储模型限制，**重定义为四种能力的组合**：

1. **按需下载（On-demand）**：浏览即拉元数据，打开/标记离线才下载文件体到应用私有缓存；LRU 清理。
2. **选择性离线（Selective offline）**：用户把某文件/文件夹标记为"保持离线"，后台保持其最新副本。
3. **相册自动上传（Camera upload）**：MediaStore observer 增量发现新照片/视频 → 上传队列。这是移动端双向同步**最高频的上行场景**。
4. **本地变更回传**：App 内的重命名/移动/删除/新建 → 本地变更队列 → 调 API → 等待云端确认。

"下行"（云端变更同步到本机的离线副本与列表）**依赖后端变更游标**（§6）。在游标 API 就绪前，下行只能靠"打开目录时主动 `GET /api/files` 刷新"这种**惰性拉取**降级实现。

---

## 5. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│  UI 层 (Jetpack Compose, Material 3, 深色 #7C6AF7)         │
│  Home · Files · Shared · Settings   +  文件详情/上传/分享    │
└───────────────▲──────────────────────────┬───────────────┘
                │ StateFlow                 │ intent/action
┌───────────────┴──────────────────────────▼───────────────┐
│  ViewModel 层 (MVVM + UDF)                                  │
└───────────────▲──────────────────────────┬───────────────┘
                │                           │
┌───────────────┴───────────────────────────▼──────────────┐
│  Repository 层                                             │
│   FilesRepo · UploadRepo · SyncRepo · AuthRepo · ShareRepo │
└──────▲────────────▲───────────────▲──────────────▲────────┘
       │            │               │              │
┌──────┴────┐ ┌─────┴──────┐ ┌──────┴──────┐ ┌─────┴────────┐
│ Room (本地 │ │ Sync Engine│ │ API Client  │ │ Auth/Keystore│
│ 索引+缓存) │ │ (状态机)    │ │(OkHttp+直传)│ │ (token 安全)  │
└───────────┘ └─────▲──────┘ └─────────────┘ └──────────────┘
                    │
            ┌───────┴────────┐
            │ WorkManager     │  上传/下载/相册扫描/游标拉取
            │ + 前台服务      │  (受 Doze/约束调度)
            └────────────────┘
```

### Room 本地 schema（镜像 `sync-schema.ts`，增补移动端字段）

```kotlin
// 镜像桌面 local_files
@Entity
data class FileIndex(
  @PrimaryKey val relativePath: String, // 或以 remoteId 为主键，移动端无固定本地根
  val remoteId: String?,
  val name: String,
  val parentFolderId: String?,
  val size: Long,
  val mtimeMs: Double,
  val hash: String?,            // SHA-256，与桌面一致
  val status: SyncStatus,       // queued/syncing/uploaded/failed/deleted/skipped
  val offlinePinned: Boolean,   // 移动端新增：保持离线
  val localCachePath: String?,  // 移动端新增：私有缓存中的文件体
  val lastError: String?,
  val updatedAt: String,
)

@Entity data class SyncActivity(...)   // 镜像 sync_activity
@Entity data class FolderRollup(...)   // 镜像 folder_rollup（目录聚合计数）
@Entity data class UploadQueue(...)    // 上传队列（含相册自动上传项）
```

### 同步状态机（与桌面对齐）

```
QueueReason: created | changed | deleted | rescan | retry
FileStatus : queued -> syncing -> uploaded
                         └─ failed ──(retry)─┘
                       deleted | skipped
```

---

## 6. 后端前置依赖（双向同步的硬阻塞）

这些必须由 web/API 侧先补齐，Android 才能做"完整双向同步"。建议作为 §8 的 **M0**。

1. **变更游标 / 增量 API**（最关键）
   ```
   GET /api/changes?cursor=<opaque>&limit=
   -> { changes:[{type:upsert|delete, id, parentFolderId, name, size, hash, modifiedAt}],
        nextCursor, hasMore }
   ```
   语义：返回自 `cursor` 以来的文件/文件夹增删改；首次同步用空 cursor 拉全量基线。Desktop 的 MVP2 ("cloud change cursor") 也需要它——**两端共用，一次投入双端收益**。

2. **文件下载约定**
   ```
   GET /api/files/{id}/content        302 -> 对象存储签名直链   （按需下载）
   或   POST /api/download/presign      -> { downloadUrl, expiresIn }
   ```

3. **软删除游标**：删除需通过变更游标可被其他端感知（trashedAt），否则离线副本无法回收。

4. **移动授权页**：`/desktop/authorize` 复制一份 `/mobile/authorize`（或参数化复用），深链改 App Links `https://gyenbox.com/app/auth/callback`（App Links 比自定义 scheme `gyenbox://` 更安全、防劫持）。

> 在 M0 就绪前，Android 可先做**只读 + 上传**（不依赖游标），把双向同步的"下行"留到游标 API 落地。这也正好对应一条更稳的交付节奏。

---

## 7. 模块划分（Gradle）

```
:app            Compose UI + 导航 + ViewModel
:core-data      Room、DataStore、缓存管理
:core-network   API client、DTO、token 拦截器
:core-sync      同步引擎（状态机、reconciliation、队列）
:core-auth      Custom Tabs 授权、Keystore、会话刷新
:core-design    主题/组件（深色 #7C6AF7，对齐导航参考）
:core-common    工具、SHA-256、结果类型
```

---

## 8. 里程碑

| 里程碑 | 内容 | 依赖 |
|---|---|---|
| **M0 后端前置** | 变更游标 API、下载直链、软删除游标、`/mobile/authorize` 页 | web 侧；与 Desktop MVP2 共用 |
| **M1 骨架 + 认证** | Gradle 多模块、Compose 4-Tab 骨架、App Links 授权、Keystore 存 token、会话刷新 | — |
| **M2 只读浏览 + 下载** | 文件/文件夹列表、详情、搜索、按需下载到缓存、分享链接查看 | M1（下行依赖 M0 的下载直链） |
| **M3 上传** | SAF 手动上传、相册自动上传、WorkManager 上传队列（presign/PUT/complete） | M1 |
| **M4 双向同步** | 本地变更回传 + 游标拉取下行 + 冲突策略 + 选择性离线 + LRU 缓存清理 | **M0**、M2、M3 |
| **M5 收尾** | 通知、Doze/约束调优、Share target（系统分享到 GyenBox）、设置完善 | M2–M4 |

> 可并行：M2 / M3 在 M1 后并行；M0 与 M1 并行（后端 vs 客户端）。

---

## 9. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 同步算法两端漂移（TS vs Kotlin） | 行为不一致、难排查 | 抽 `docs/sync-spec.md` + JSON 测试向量，两端跑同一套 fixtures |
| 后端游标 API 延期 | M4 阻塞 | M2 降级为惰性拉取先上；游标就绪再补真正下行 |
| Android 后台执行限制（Doze/厂商杀进程） | 同步不及时 | 前台服务 + WorkManager 约束 + 用户引导关闭省电限制 |
| 大文件直传中断 | 上传失败率 | 后续引入分块上传/断点续传（与桌面 MVP 同为后置项） |
| 自定义 scheme 深链被劫持 | 授权安全 | 改用 App Links（域名验证） |

---

## 10. 待你拍板的开放问题

1. **M0 谁做**：变更游标 / 下载直链是后端工作，要不要这一阶段就排进 web 路线图？（它同时解锁 Desktop 双向同步）
2. **离线策略默认值**：默认全按需（省空间）还是允许"整文件夹保持离线"？
3. **iOS 是否在规划内**：若 12 个月内要做 iOS，则**路线 B（Rust 共享核心）的优先级应前移**，否则维持 v1 Kotlin 原生。
4. **最低支持版本**：建议 minSdk 26 (Android 8.0) 或 28 (9.0)，影响 SAF/通知/前台服务的可用 API。
```
