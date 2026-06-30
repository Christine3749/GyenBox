# GyenBox Android 客户端 - 产品设计稿与功能规格

> 第二阶段产品设计文档。配套技术架构见 `docs/android-architecture.md`，视觉线框见 `docs/android-wireframes.svg`。
> 状态：草案 · 用于评审 Android v1 的产品范围、页面结构、交互流程和功能边界。

---

## 0. 结论

Android v1 应该定位为一个**可信的移动云盘客户端**，而不是桌面端的缩小版同步盘。

第一版主体验：

1. 登录后立即看到云端文件、最近活动、存储用量和同步状态。
2. 用户可以浏览、搜索、预览、下载、收藏、重命名、移动、删除文件。
3. 用户可以手动上传文件，也可以开启相册自动上传。
4. 用户可以把重要文件或文件夹标记为离线保存。
5. 用户可以从文件详情中创建分享链接。
6. 后端变更游标完成前，下行同步采用“打开页面刷新 + 手动刷新 + 周期性惰性刷新”；完成后再升级为真正的游标拉取。

最重要的产品边界：

- **做**：移动端自然的“按需访问 + 上传 + 离线保存 + 相册备份”。
- **不做**：Android v1 不承诺整盘镜像、不暴露本地文件系统根目录、不做类似 Windows Explorer 的占位符体验。

---

## 1. 产品定位

### 目标用户

| 用户 | 主要场景 | Android 价值 |
|---|---|---|
| 个人用户 | 手机拍照、收文件、临时查看 PDF/图片/文档 | 快速上传、随时找文件、离线保存关键资料 |
| 桌面端用户 | Windows 上同步工作资料，手机端随时访问 | 移动查看、分享、补充上传 |
| 轻团队用户 | 分享链接、客户收件、跨设备查看 | 手机端快速转发链接、确认文件状态 |

### v1 产品原则

1. **文件状态必须可信**：上传中、已上传、离线可用、同步失败、等待网络，都要可见。
2. **默认省电省流量**：按需下载，Wi-Fi 优先，相册自动上传默认可控。
3. **操作可恢复**：删除进入回收站语义；上传失败保留队列；离线缓存可手动清理。
4. **移动优先**：少做层级很深的管理页，多做快速打开、搜索、分享、上传。
5. **与 Web/Desktop 行为对齐**：文件命名、版本、收藏、分享、上传限制、会员额度都服从现有后端。

---

## 2. MVP 范围

### 功能分层

| 功能 | v1 必做 | v1.1 / Beta | 完整同步阶段 |
|---|---:|---:|---:|
| 登录 / 续期 / 退出 | 是 | - | - |
| Home 总览 | 是 | 增加最近变更明细 | 游标驱动实时状态 |
| 文件夹浏览 | 是 | 网格/列表记忆 | 游标下行刷新 |
| 文件搜索 | 是 | 高级筛选 | 内容搜索 / AI 搜索 |
| 文件预览 | 是，系统预览优先 | App 内图片/PDF 轻预览 | 版本对比 |
| 按需下载 | 是 | 下载任务管理 | 断点续传 |
| 选择性离线 | 是，文件级优先 | 文件夹级 | 游标保持最新 |
| 手动上传 | 是 | 多文件批量 | 分块/断点上传 |
| 相册自动上传 | 是，照片/视频 | 去重与按相册筛选 | 云端游标对账 |
| 新建文件夹 | 是 | 批量移动 | - |
| 重命名 / 移动 / 收藏 / 删除 | 是 | 撤销提示 | 跨端冲突处理 |
| 创建分享链接 | 是 | 分享管理列表 | 协作者权限 |
| Shared Tab | 半功能：入口 + 本机最近创建 | 列出全部分享 | 撤销/编辑分享 API |
| Settings | 是 | 细粒度网络策略 | 设备管理 |
| 完整双向同步 | 否 | 部分离线集合 | 依赖 M0 变更游标 |

### v1 不做

- 不做整盘镜像，不让用户选择“把整个 GyenBox 云盘同步到手机文件系统”。
- 不申请 broad storage / 管理所有文件权限。
- 不做文件夹下载成 zip，除非后端已有稳定能力。
- 不做多人实时协作编辑。
- 不做后台秒级同步承诺。
- 不把现有 Windows Cloud Files 行为照搬到 Android。

---

## 3. 信息架构

底部四 Tab 沿用既定参考：Home / Files / Shared / Settings。

```
GyenBox Android
├─ Home
│  ├─ 存储用量
│  ├─ 同步健康状态
│  ├─ 快捷操作：Upload / Camera Backup / Offline / Scan
│  ├─ 最近文件
│  └─ 上传队列摘要
├─ Files
│  ├─ Root / Folder
│  ├─ Search
│  ├─ Sort / Filter / View mode
│  ├─ File detail
│  ├─ Preview / Open with
│  ├─ Download / Make offline
│  └─ Actions: rename / move / star / share / delete
├─ Shared
│  ├─ Created links
│  ├─ Recently shared locally
│  ├─ Link detail
│  └─ Empty / API pending state
└─ Settings
   ├─ Account
   ├─ Storage & cache
   ├─ Camera backup
   ├─ Sync behavior
   ├─ Notifications
   ├─ Security
   └─ About / diagnostics
```

---

## 4. 核心页面设计

### 4.1 Launch / Auth

**目标**：让用户清楚知道自己是在授权移动设备，而不是重新注册一个孤立账号。

页面元素：

- GyenBox logo
- 标题：`Access your GyenBox anywhere`
- 副文案：`Sign in to view, upload, and keep files offline on this device.`
- 主按钮：`Continue`
- 次级入口：`Use another account`
- 底部安全说明：`Your session is protected on this device.`

流程：

1. App 生成 `state`、`deviceName`、`appVersion`。
2. 打开 Custom Tab 到 `/mobile/authorize`，短期可复用 `/desktop/authorize?platform=android`。
3. Web 完成 HalfSphere 登录。
4. 回到 App Links callback。
5. App 校验 `state`，保存 token 到安全存储。
6. 进入 Home。

异常状态：

| 状态 | UI |
|---|---|
| 用户取消授权 | 回到登录页，toast：`Sign-in was cancelled.` |
| state 不匹配 | 阻断，显示 `This sign-in link is no longer valid.` |
| token 保存失败 | 显示错误页，引导重试 |
| 网络不可用 | 登录页内联提示，不弹全屏错误 |

---

### 4.2 Home

**目标**：让用户一眼知道“我账号空间怎样、同步是否正常、最近有什么、现在能做什么”。

布局：

1. 顶部栏
   - 左侧：GyenBox logo + `GyenBox`
   - 中间：搜索入口
   - 右侧：上传图标按钮
2. 存储用量
   - `74.2 GB of 128 GB used`
   - 进度条
   - 点击进入 Storage & cache
3. Sync Health
   - 正常：`All caught up`
   - 上传中：`3 uploads running`
   - 离线：`Offline. Changes will resume later.`
   - 失败：`2 items need attention`
4. Quick Actions
   - Upload files
   - Camera backup
   - Offline files
   - Scan now
5. Recent
   - 最近打开/下载/上传的文件
6. Queue Summary
   - 有队列时显示上传/下载进度
   - 无队列时隐藏，不占空间

Home 不展示过多营销文案，优先作为工作台。

---

### 4.3 Files

**目标**：移动端最高频页面。要快、稳、可扫描。

顶部：

- Breadcrumb：`Files / Project / Design`
- 搜索框：默认 hint `Search files`
- 工具按钮：排序、筛选、列表/网格切换、更多

列表模式默认：

| 元素 | 内容 |
|---|---|
| 左侧图标 | 文件类型或文件夹 |
| 主标题 | 文件名，最多两行 |
| 副标题 | 类型 / 大小 / 更新时间 |
| 状态区 | 离线、分享、收藏、同步中、失败 |
| 右侧 | 更多菜单 |

网格模式：

- 适合图片、文件夹、PDF。
- 手机默认仍用列表；用户切换后记忆。

文件夹空状态：

- 图标：文件夹
- 文案：`This folder is empty`
- 操作：`Upload files`、`New folder`

网络异常：

- 保留上次缓存列表。
- 顶部显示小条：`Showing saved list. Pull to retry.`

---

### 4.4 File Detail

打开方式：

- 点文件行：若可预览，进入 Preview；否则进入详情并提供 `Open with`。
- 点更多：底部 action sheet。

详情内容：

- 文件图标 / 缩略图
- 文件名
- 类型、大小、更新时间
- 状态：云端可用 / 本机离线 / 下载中 / 上传中 / 同步失败
- 所在位置
- 所有者
- 分享状态

主要操作：

| 操作 | v1 行为 | API |
|---|---|---|
| Open / Preview | 使用本地缓存或先下载 | `GET /api/download/{id}` |
| Download | 下载到 app 私有缓存 | 当前可用，但建议升级直链 |
| Make available offline | pin 到离线集合 | 本地 Room + WorkManager |
| Share link | 创建链接 | `POST /api/shares` |
| Rename | 改名 | `PATCH /api/files/{id}` |
| Move | 选择目标文件夹 | `PATCH /api/files/{id}` |
| Star | 收藏 | `PATCH /api/files/{id}` |
| Delete | 移到回收站 | `DELETE /api/files/{id}` |

删除确认：

- 标题：`Move to trash?`
- 正文：`This removes the item from GyenBox, but it can be restored from the web app trash.`
- 按钮：`Cancel` / `Move to trash`

---

### 4.5 Preview / Open

预览策略：

| 类型 | v1 策略 |
|---|---|
| 图片 | App 内轻预览，支持缩放 |
| PDF | 系统 PDF viewer 或 `ACTION_VIEW` |
| 视频 | 系统播放器 |
| Office / 文本 / 压缩包 | `Open with` |
| 未知类型 | 详情页 + 下载 / Open with |

缓存：

- 文件先下载到 app 私有缓存。
- 临时打开的文件可被 LRU 清理。
- 用户 pin 的文件不可自动清理，除非用户取消离线或手动清理。

---

### 4.6 Upload

上传入口：

- Home 顶部上传按钮
- Home Quick Action
- Files 页面 floating action button
- Android 系统分享目标：`Share to GyenBox`（M5）

上传类型：

1. **手动文件上传**
   - 使用系统文件选择器。
   - 支持多选。
   - 上传目标默认当前文件夹。
2. **相册自动上传**
   - 设置页开启。
   - 首次开启时解释权限与网络策略。
   - 默认仅 Wi-Fi，可切换允许蜂窝。
3. **从其他 App 分享进来**
   - v1.1 或 M5。

上传队列状态：

| 状态 | 文案 |
|---|---|
| 等待网络 | `Waiting for Wi-Fi` |
| 等待电量/后台机会 | `Queued` |
| 计算校验 | `Preparing` |
| 请求预签名 | `Reserving upload` |
| 上传中 | `Uploading 42%` |
| 完成 metadata | `Finishing` |
| 成功 | `Uploaded` |
| 失败可重试 | `Tap to retry` |
| 配额不足 | `Storage limit reached` |
| 单文件超限 | `File exceeds plan limit` |

上传协议对齐现有后端：

1. 计算 SHA-256。
2. `POST /api/upload/presign`。
3. `PUT uploadUrl`。
4. `POST /api/upload/complete`。
5. 更新本地索引与队列状态。

---

### 4.7 Camera Backup

**目标**：这是 Android 最有价值的上行同步能力。

设置项：

- 开关：`Camera backup`
- 账号目标文件夹：默认 `Camera Uploads`
- 网络：`Wi-Fi only` 默认开启
- 视频：默认关闭，可开启
- 后台通知：默认开启
- 仅充电时上传：可选

首次开启流程：

1. 说明页：`Back up new photos and videos to GyenBox.`
2. 选择内容范围：照片 / 视频。
3. 请求系统照片权限或使用系统 Photo Picker。
4. 选择目标文件夹。
5. 显示首次扫描进度。

去重策略：

- v1：以 `mediaStoreId + size + modifiedAt` 建本地记录，上传前计算 checksum。
- 若云端存在同 checksum 和同名文件，默认跳过或生成副本名，冲突策略见 §8。
- 删除手机本地照片不自动删除云端备份。
- 删除云端备份不自动删除手机相册。

---

### 4.8 Offline Files

入口：

- Home Quick Action `Offline`
- Files 筛选 `Available offline`
- 文件详情 `Make available offline`

行为：

- 文件级 pin：v1 必做。
- 文件夹级 pin：v1.1 或 Beta；M0 游标后才真正可靠保持最新。
- 离线页面列出已 pin 文件、下载中、失败项。
- 用户可取消离线，文件保留云端，只清本机缓存。

状态：

| 状态 | 图标/文案 |
|---|---|
| 已离线 | check circle + `Available offline` |
| 下载中 | progress + `Downloading` |
| 过期 | warning + `Needs refresh` |
| 失败 | alert + `Retry download` |

---

### 4.9 Shared

当前后端有 `POST /api/shares`，但缺少完整的 share list / revoke / update API。因此 Shared Tab 采用分阶段设计。

v1：

- 展示“本机最近创建的分享链接”（本地记录）。
- 文件详情可创建分享链接。
- 创建成功后展示：
  - link URL
  - permission
  - expiry
  - password protected
  - copy / system share
- Shared Tab 若没有后端列表能力，显示说明态：`Full shared-link management is coming soon.`

v1.1：

- 补 `GET /api/shares` 后，列出全部由我创建的链接。
- 补 `DELETE /api/shares/{id}` 后，支持撤销。
- 补 `PATCH /api/shares/{id}` 后，支持改权限、过期时间、密码。

---

### 4.10 Settings

分组：

1. Account
   - email / avatar
   - plan
   - sign out
2. Storage & cache
   - storage used / quota
   - offline files size
   - temporary cache size
   - clear temporary cache
3. Camera backup
   - enable
   - upload videos
   - Wi-Fi only
   - folder target
4. Sync
   - sync over cellular
   - background sync status
   - retry failed items
   - diagnostics export
5. Notifications
   - upload completion
   - failures
   - camera backup progress
6. Security
   - app lock（后置）
   - session refresh
   - remove this device
7. About
   - app version
   - terms / privacy
   - open source notices

---

## 5. 视觉规格

### 基调

沿用 `android-bottom-nav-reference.svg`：

- 深色背景
- 主色 `#7C6AF7`
- 64dp bottom navigation
- Home / Files / Shared / Settings 四 Tab

### 颜色

| Token | 值 | 用途 |
|---|---|---|
| `bg` | `#050508` | App 背景 |
| `surface` | `#07070E` | 主页面底 |
| `surface-raised` | `#0F0F1A` | bottom nav / top bar |
| `surface-control` | `#13131F` | 搜索框、筛选条 |
| `border` | `#1E1E2E` | 分割线 |
| `text-primary` | `#EEEEF8` | 主文字 |
| `text-secondary` | `#A6A6C2` | 次文字 |
| `text-muted` | `#6F6F8F` | 弱文字 |
| `accent` | `#7C6AF7` | 主操作、激活态 |
| `success` | `#3DDC97` | 已同步 / 已离线 |
| `warning` | `#F0A500` | 等待 / 注意 |
| `danger` | `#FF5C7A` | 失败 / 删除 |
| `info` | `#3B9EFF` | 下载 / 信息 |

注意：`#4A4A6A` 可继续用于低优先级标注和线框，但正文次级文字不要过暗。

### 排版

- UI 默认使用系统字体。
- 中文环境使用系统中文字体。
- 数字、容量、状态码可使用等宽字体。
- 不用随视口缩放的字体。
- 文件名最多两行，超出 ellipsize middle 或 end，详情页展示全名。

### 间距与触控

| 元素 | 规格 |
|---|---|
| 页面左右边距 | 20dp |
| 列表行高度 | 64-72dp |
| 图标按钮触控区 | 最小 48dp |
| Bottom nav 高度 | 64dp |
| Tab icon | 20-22dp |
| 搜索框高度 | 40-44dp |
| 主按钮高度 | 48dp |
| 卡片圆角 | 8dp 或更小 |

---

## 6. 组件规格

### FileRow

字段：

- `icon`
- `name`
- `metadata`
- `statusBadges`
- `moreAction`

状态 badge 优先级：

1. failed
2. uploading/downloading
3. offline
4. shared
5. starred

### SyncStatusStrip

用于 Home 顶部或 Files 列表上方。

| 状态 | 文案 | 交互 |
|---|---|---|
| caught_up | `All caught up` | 点击进入活动日志 |
| running | `Syncing 3 items` | 点击进入队列 |
| offline | `Offline` | 点击查看离线说明 |
| blocked | `2 items need attention` | 点击进入 Sync issues |

### UploadTaskRow

显示：

- 文件名
- 目标文件夹
- 状态文案
- 进度条
- retry / cancel

### BottomActionSheet

用于文件更多菜单。

分组：

1. Open / Download / Make offline
2. Share / Star / Move / Rename
3. Delete

删除用 danger 样式，始终放底部。

---

## 7. 功能规格

### 7.1 认证

| 项 | 规格 |
|---|---|
| 登录入口 | Custom Tabs |
| 回调 | App Links 优先，短期可保留 `gyenbox://auth/callback` |
| token 存储 | Keystore + 加密本地存储 |
| 续期 | `POST /api/desktop/session/refresh`，建议后端后续别名为 `/api/mobile/session/refresh` |
| 退出 | 清 token、清本地队列敏感 header、保留非敏感缓存需用户确认 |

### 7.2 文件浏览

| 项 | 规格 |
|---|---|
| 列表 API | `GET /api/files?folderId=...` |
| 缓存 | Room 保存最近访问目录 |
| 手动刷新 | Pull to refresh |
| 分页 | 当前 API 返回 `nextCursor: null`，v1 先按现状处理 |
| 排序 | name / modified / size，按 API 能力逐步接入 |

### 7.3 文件操作

| 操作 | API | 本地处理 |
|---|---|---|
| 新建文件夹 | `POST /api/folders` | 成功后插入当前目录 |
| 重命名 | `PATCH /api/files/{id}` | 乐观更新，失败回滚 |
| 移动 | `PATCH /api/files/{id}` | 目标选择器 |
| 收藏 | `PATCH /api/files/{id}` | 乐观更新 |
| 删除 | `DELETE /api/files/{id}` | 当前列表移除，显示 undo-like toast（仅本地撤销；后端恢复后置） |

### 7.4 下载

现状：

- `GET /api/download/{id}` 默认 302 跳转到 5 分钟有效的 GCS 签名下载 URL。
- 带 `Accept: application/json` 时返回 `{ downloadUrl, expiresIn }`，方便 Web / Mobile 客户端接管下载任务。

Android v1 可用策略：

- 使用 JSON 模式拿到 `downloadUrl`，再交给 DownloadManager / WorkManager 下载。
- 大文件必须显示明确进度，支持取消，并在 URL 过期时重新请求。
- 不再让 Web API 进程整文件读入内存。

### 7.5 上传

见 §4.6。

失败重试：

- 网络错误：指数退避。
- 401：刷新 session 后重试一次。
- 403 plan restricted：停止并显示升级/联系提示。
- 413 quota exceeded：停止，不自动重试。
- 409 upload mismatch：重新 presign 并完整重传。

### 7.6 搜索

| 项 | 规格 |
|---|---|
| API | `GET /api/search?q=...` |
| 触发 | 输入 300ms debounce |
| 空 query | 显示最近搜索/最近文件 |
| 离线 | 搜本地缓存，标注 `offline results` |

### 7.7 分享

| 项 | 规格 |
|---|---|
| 创建 | `POST /api/shares` |
| 权限 | VIEW / COMMENT / EDIT，v1 UI 默认 VIEW |
| 密码 | 可选，高级项 |
| 过期 | 可选，默认 none |
| 分享出去 | Android system share sheet |

### 7.8 离线缓存

| 项 | 规格 |
|---|---|
| 临时缓存 | 打开/预览产生，可 LRU 清理 |
| Pin 缓存 | 用户标记离线，不自动清 |
| 默认上限 | 临时缓存 2GB 或设备可用空间 10%，取较小值 |
| 清理入口 | Settings / Storage & cache |
| 空间不足 | 暂停下载，提示用户清理 |

---

## 8. 同步与冲突

### v1 同步语义

后端变更游标未完成前：

- Files 页面打开时拉当前目录。
- Pull to refresh 重新拉当前目录。
- Home 最近文件来自本地缓存 + 当前 API 可得数据。
- 离线文件通过 WorkManager 周期性校验，但无法保证跨设备实时发现删除/重命名。

后端 M0 完成后：

- App 保存 `syncCursor`。
- 后台拉 `GET /api/changes?cursor=...`。
- upsert 更新本地索引。
- delete/trashed 标记本地离线文件为过期或待清理。
- 对已 pin 文件自动排下载任务。

### 冲突策略

| 场景 | v1 行为 |
|---|---|
| 手机上传同名文件，云端已有同名 | 默认生成副本名：`name (Android).ext`，或后端按 fileId 覆盖 |
| 手机离线重命名，同时云端改名 | M0 前无法可靠发现；M0 后保留两边，提示用户 |
| 相册备份重复 | 同 checksum 跳过；不同 checksum 同名则生成副本名 |
| 删除与上传交错 | 上传完成前删除本地队列项；上传完成后删除走 API |

---

## 9. 权限与系统能力

| 能力 | Android 做法 |
|---|---|
| 选择文件上传 | Storage Access Framework / system picker |
| 相册选择 | Android Photo Picker 优先 |
| 相册自动发现 | MediaStore 查询 + 本地游标 |
| 后台任务 | WorkManager |
| 长上传/下载 | 前台服务通知 + WorkManager |
| 通知 | 上传/下载进度、失败、相册备份摘要 |
| App Links | 域名验证后用于授权回调 |

设计要求：

- 权限要在用户开启相关功能时请求，不在首次启动时堆叠请求。
- 每个权限请求前有一页解释“为什么需要”。
- 用户拒绝权限后，功能页保留，但显示受限状态和设置入口。

参考：

- Android Photo Picker: https://developer.android.com/training/data-storage/shared/photopicker
- Storage Access Framework: https://developer.android.com/training/data-storage/shared/documents-files
- WorkManager long-running workers: https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running
- Android App Links: https://developer.android.com/training/app-links

---

## 10. 文案规范

界面文案 v1 建议以英文为主，与现有 Web/Desktop 的英文 UI 保持一致；所有文案进入资源文件，预留中文本地化。

常用文案：

| 场景 | 文案 |
|---|---|
| 同步正常 | `All caught up` |
| 上传运行中 | `Uploading {count} items` |
| 下载运行中 | `Downloading {count} items` |
| 离线 | `Offline. Changes will resume later.` |
| 失败 | `{count} items need attention` |
| 空文件夹 | `This folder is empty` |
| 搜索空 | `No files found` |
| 配额不足 | `Storage limit reached` |
| 单文件超限 | `File exceeds plan limit` |
| 授权取消 | `Sign-in was cancelled` |

---

## 11. 验收标准

### M1 骨架 + 认证

- App 启动显示登录页。
- Custom Tab 授权后能回到 App。
- token 安全保存，重启后仍保持登录。
- Home / Files / Shared / Settings 四 Tab 可切换。
- 退出登录后本地敏感信息清除。

### M2 浏览 + 下载

- Files 能列出 root 和子文件夹。
- 能搜索文件名。
- 能打开文件详情。
- 能下载文件到缓存并用系统应用打开。
- 网络断开时显示缓存列表和离线提示。
- 下载失败可重试。

### M3 上传 + 相册备份

- 能从系统文件选择器上传到当前文件夹。
- 上传队列显示进度、失败、重试。
- 401 后能刷新 session 再重试。
- 配额不足和单文件超限显示明确错误。
- 相册自动上传能发现新增图片并上传到目标文件夹。

### M4 离线 + 双向同步

- 用户能把文件标记离线。
- 离线文件断网可打开。
- M0 完成后，云端变更能通过游标进入本地索引。
- 已 pin 文件在云端更新后能自动刷新本地副本。
- 删除/重命名冲突有明确提示，不静默覆盖。

---

## 12. 后端需求清单

这些不是 Android UI 阻塞项，但会影响最终体验完整度。

| 需求 | 优先级 | 说明 |
|---|---:|---|
| `/api/changes?cursor=` | P0 | 完整双向同步必需，Desktop MVP2 也需要 |
| 下载签名直链或流式下载 | P0 | 移动端大文件下载必需 |
| `/mobile/authorize` 或 authorize 参数化 | P0 | 安全清晰的移动授权页 |
| `GET /api/shares` | P1 | Shared Tab 完整列表 |
| `DELETE /api/shares/{id}` | P1 | 撤销分享 |
| `PATCH /api/shares/{id}` | P2 | 编辑权限/过期/密码 |
| 恢复回收站 API | P2 | Android 删除撤销与恢复 |
| 分块上传/断点续传 | P2 | 大文件稳定性 |
| 文件内容/AI 搜索 | P3 | 高级搜索 |

---

## 13. 推荐实施顺序

1. 先做 `apps/android` 空工程、主题、四 Tab、假数据页面。
2. 接入认证和 token 续期。
3. 接入 Files 列表、搜索、文件详情。
4. 接入下载和系统打开。
5. 接入手动上传队列。
6. 接入相册自动上传。
7. 接入离线保存。
8. 后端 M0 就绪后接入变更游标，升级为完整移动端双向同步。

---

## 14. 当前拍板项

建议默认决策：

| 问题 | 建议 |
|---|---|
| v1 UI 语言 | 英文 UI，文档中文，资源预留中英文 |
| minSdk | 28，降低后台与通知兼容成本 |
| 默认下载策略 | 按需下载 |
| 默认相册上传 | 用户显式开启，默认 Wi-Fi only |
| 默认离线策略 | 文件级 pin，文件夹级后置 |
| v1 Shared Tab | 创建分享 + 本机最近分享，完整管理等 API |
| Rust 共享核心 | 不阻塞 v1，等 iOS 或同步漂移压力出现后再提 |
