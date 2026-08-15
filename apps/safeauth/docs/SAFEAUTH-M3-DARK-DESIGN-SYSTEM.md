# SafeAuth × Material 3 深色设计系统

> 版本：1.0 · 模式：**Dark only** · 状态：后续 SafeAuth 页面与组件的强制基线  
> 定位：采用 Google Material Design 3 的**角色化色彩、状态层、可访问性与自适应布局原则**，但不复制 Google 品牌视觉。SafeAuth 仍是深色终端安全产品。

本系统不是“Google 紫色主题”。SafeAuth 的品牌种子仍为 `#6D5EF5`；Google 的 Material Color Utilities 负责从种子色导出具备语义和对比度关系的深色 token。不可为方便而直接把任意颜色填到按钮、文字或背景上。

## 1. 单一事实来源

| 内容 | 存放位置 | 作用 |
| --- | --- | --- |
| 可直接引用的 CSS token | `src/styles/safeauth-m3-dark-tokens.css` | **实现唯一来源** |
| 生成器 | `scripts/generate-m3-dark-tokens.mjs` | 使用官方 Material Color Utilities 复算 token |
| 本文 | `docs/SAFEAUTH-M3-DARK-DESIGN-SYSTEM.md` | 设计、交互与验收来源 |
| 原始终端风格基准 | `docs/SAFEAUTH-DARK-VI.md` | 视觉性格、信息密度与禁止项 |

如果 token 与旧 class 中的硬编码色值不同：**新增/重构代码以 M3 token 为准**；旧样式在单独迁移任务中替换，不在无关功能改动中顺带调整。

## 2. 色彩系统

### 2.1 生成规则

- 种子色：`#6D5EF5`（SafeAuth 紫）。
- 生成器：Google `@material/material-color-utilities`。
- 方案：`SchemeTonalSpot`、`dark = true`、`contrastLevel = 0`。
- 不启用随壁纸变化的动态配色。SafeAuth 是安全工具，系统色必须稳定、可审计；“动态色”的角色体系保留，但颜色固定。
- 所有核心色均按**语义角色**引用，例如 `var(--sa-sys-color-primary)`，不按视觉名称引用，例如“淡紫色”。

### 2.2 核心 M3 深色角色

| 角色 | 色号 | 使用范围 |
| --- | --- | --- |
| `background` | `#131318` | 页面画布 |
| `surface` | `#131318` | 最低层的实体表面 |
| `surface-container-lowest` | `#0E0E13` | 最深的静态/验证码底面 |
| `surface-container-low` | `#1C1B20` | 低层面板 |
| `surface-container` | `#201F25` | 标准卡片、输入与控件组 |
| `surface-container-high` | `#2A292F` | 悬停面板、强调层 |
| `surface-container-highest` | `#35343A` | 最高层/强区分容器 |
| `surface-variant` | `#47464F` | 次要选中面、低强调对比面 |
| `on-surface` | `#E5E1E9` | 高强调文字与图标 |
| `on-surface-variant` | `#C8C5D0` | 次级文字、边框内说明 |
| `outline` | `#928F99` | 明确轮廓、非默认分隔 |
| `outline-variant` | `#47464F` | 默认细分隔线与卡片边框 |
| `primary` | `#C5C0FF` | 主操作、焦点、主选择状态 |
| `on-primary` | `#2E2960` | `primary` 实底上的文字/图标 |
| `primary-container` | `#444078` | 主色低密度容器、选中面 |
| `on-primary-container` | `#E4DFFF` | 主色容器内文字/图标 |
| `secondary` | `#C8C4DC` | 非主要的相关操作 |
| `secondary-container` | `#474459` | 次级分组/标签容器 |
| `tertiary` | `#EBB8D0` | 稀少的第三层强调，不用于警告 |
| `error` | `#FFB4AB` | 阻断性错误/临期错误文本与图标 |
| `error-container` | `#93000A` | 错误容器；只用于明确错误，不用于普通提醒 |
| `scrim` | `#000000` | 弹窗遮罩基础色 |

完整角色（包括 fixed、dim、inverse）已经定义在 CSS token 文件内；不得自行补造同义颜色。

为保留 SafeAuth 的终端安全身份，应用最外层画布使用品牌覆写 `safeauth-canvas: #060609`；其余组件层级继续使用上述 M3 surface 角色。这是唯一允许偏离 M3 基准 `background` 的深色表面。

### 2.3 扩展分类色

类别色是 SafeAuth 的 M3 Extended Color。只可出现于该类别的账号卡、图标、标签、倒计时与复制行为；不能改变顶栏、主背景或全局 CTA。

| 类别 | 前景 `primary` | 容器 `primary-container` | 容器前景 `on-primary-container` |
| --- | --- | --- | --- |
| 工作办公 | `#94CDF7` | `#004C6E` | `#C9E6FF` |
| 云服务 | `#82D5C7` | `#005048` | `#9EF2E3` |
| 金融理财 | `#8ED5B0` | `#005236` | `#AAF2CC` |
| 开发运维 | `#DBB9F9` | `#563B70` | `#F0DBFF` |
| 个人社交 | `#F8BB71` | `#653E00` | `#FFDDB8` |
| 重点收藏 | `#FFB2B7` | `#723339` | `#FFDADB` |

风险语义不可借用类别色：成功使用 Finance 的绿色系、提醒使用 Personal 的琥珀系、错误使用 `error` 角色。

### 2.4 状态层（不可手调）

状态层覆盖在组件自身颜色上，颜色采用组件的 `on-*` 前景色或主色，而不是另换一个 hover 色。

| 状态 | 不透明度 | 必须具备的反馈 |
| --- | ---: | --- |
| hover | 8% | 指针悬停时的表面/图标反馈 |
| focus | 12% | 键盘/语音焦点；额外保留 2px 可见焦点环 |
| pressed | 12% | 鼠标按下或触摸激活 |
| dragged | 16% | 可拖动项目正在拖动 |
| disabled content | 38% | 禁用文字/图标 |
| disabled container | 12% | 禁用容器 |

## 3. 排版、图标与形状

### 3.1 字体规则

- **安全系统层**（品牌、服务名、验证码、分类、技术元数据、按钮）：等宽字体 `font-mono`。
- **阅读层**（中文完整句、风险说明、帮助文本）：无衬线 `font-sans`。
- 不强制使用 Google Sans；它不是本项目的可分发字体依赖。采用 M3 的层级方法，保留 SafeAuth 的等宽身份。

| M3 角色 | SafeAuth 尺寸 / 行高 | 用途 |
| --- | --- | --- |
| Display | 32px / 40px | 锁屏或极少数仪表盘关键指标 |
| Headline | 24px / 32px | 模态框、一级工作区标题 |
| Title | 18px / 24px | 账号区标题、卡片标题 |
| Body large | 16px / 24px | 可读正文，避免用于密集列表 |
| Body medium | 14px / 20px | 描述、表单正文 |
| Body small | 12px / 16px | 账号标识、辅助信息 |
| Label large | 14px / 20px，粗体 | 主操作 |
| Label medium | 12px / 16px，粗体 | 次级操作 |
| Label small | 11px / 16px，粗体 | 标签、系统状态 |
| Micro | 8–10px / 12px | `SCORE`、快捷键、微型系统元数据 |

验证码使用 `16px / 24px`（紧凑行）或 `24–30px / 36px`（展开）和 `tracking-widest`；它是信息焦点而非装饰标题。

### 3.2 图标与形状

- 图标来自单一线框图标集，描边通常为 2px；常规尺寸 16px，次级 14px，品牌盾牌 20px。
- SafeAuth 使用适配 M3 的**紧凑形状配置**：`0 / 2 / 4 / 8px`。默认卡片和按钮为 2px；组件组/较大容器最多 8px。
- 禁止大圆角胶囊、玻璃拟态、渐变卡片、发光描边和装饰插图。M3 的可访问性与组件结构适用，但默认圆润外观不覆盖 SafeAuth 的终端身份。

## 4. 交互标准

### 4.1 操作层级

1. 每个工作区最多一个 Filled Primary Action，使用 `primary` + `on-primary`。
2. 相关但不主导的操作使用 Secondary / Outlined / Text Action；不可与主 CTA 争夺紫色实底。
3. 破坏性动作只在确认流程中使用 Error，且必须给出对象、后果和可取消入口。
4. 图标按钮必须有可见或可访问名称（`aria-label`/`title`）；纯图标不能承载陌生或高风险操作。

### 4.2 目标、键盘与焦点

- 任何可点击项目的**命中目标**至少为 48 × 48 CSS px；紧凑视觉框可更小，但以透明内边距补齐命中区。
- 所有操作可由键盘完成：`Tab` 顺序遵循视觉顺序，`Enter`/`Space` 激活，`Esc` 关闭非破坏性模态框。
- `:focus-visible` 必须有 2px `primary` 焦点环，外扩至少 2px；不能只靠颜色、阴影或 hover。
- 搜索框 `/` 聚焦；输入中的 `/` 不应劫持。现有行为保留。
- 模态框打开后焦点进入标题或第一个可操作控件；关闭后焦点返回触发源；背景不可通过键盘继续操作。

### 4.3 SafeAuth 核心流程

| 场景 | 强制行为 |
| --- | --- |
| 账号列表 | 整行可点击展开；视觉上可点击，键盘上亦可聚焦/激活 |
| 复制验证码 | 成功后立即显示确认图标与 2.5 秒 Toast；Toast 不得抢夺焦点 |
| TOTP 倒计时 | 每秒刷新；剩余 5 秒或以内切换到 Error 语义，并保留文字/时间而不是只变色 |
| 隐藏账号 | 任何显示验证码的动作都先进入 PIN 二次验证；验证取消后不得改变账号状态 |
| 锁定 | 是次级、始终可达的操作；锁定后焦点回到 PIN 解锁界面 |
| 新增账号 | 主操作；字段校验在就近位置说明，不使用只改变边框颜色的错误提示 |
| 删除 | 显示账号名称、不可逆后果和取消操作；默认焦点不能落在“删除”上 |
| 安全审计加载 | 使用明确的加载文本或进度，不只旋转图标 |

### 4.4 反馈、动效与减少动态

| 类型 | 时长 | 规则 |
| --- | ---: | --- |
| 微反馈 | 50–100ms | 图标/颜色状态切换 |
| 常规 hover/focus/展开 | 150–200ms | 采用 `--sa-sys-easing-standard`；仅改变必要属性 |
| 模态打开/关闭 | 200–300ms | 淡入 + 最多 4px 位移；不弹跳 |
| PIN 错误 | 300ms | 短水平抖动，文字错误同时出现 |
| TOTP 进度 | 1000ms linear | 与真实秒数同步 |
| Toast | 2500ms | 可读、非阻断、无焦点抢占 |

必须支持 `prefers-reduced-motion: reduce`。项目 token 文件已经将非必要动画和过渡压缩为 1ms。

## 5. 布局与自适应

遵循 M3 的 Compact / Medium / Expanded 思路，但以网页 CSS px 作为实现基准。

| 窗口范围 | 布局 |
| --- | --- |
| Compact：< 600px | 单栏；侧栏转为全宽筛选区或抽屉；工具栏保留最重要操作；目标保持 48px |
| Medium：600–839px | 主区优先；导航可收为窄轨；账号列表仍以紧凑行显示 |
| Expanded：≥ 840px | 顶栏 + 256px 左侧栏 + 主工作区；工作区最大宽度 1280px 并居中 |

- 页面基础间距为 4px 栅格；常用 8 / 12 / 16 / 24 / 32px。
- 桌面顶栏水平内边距 16px，宽屏 32px；主内容内边距 16px，宽屏 32px。
- 列表优先于网格：凭据比较、验证码阅读与倒计时都要求横向稳定对齐。

## 6. 可访问性验收

- 正常文字与背景对比度至少 **4.5:1**；大号文字至少 **3:1**；图标、边框与状态指示至少 **3:1**。
- 颜色不独自传递信息：临期、错误、隐藏、复制成功必须同时有图标、文案或数值变化。
- 正文不能只以低对比灰色表达；`on-surface-variant` 用于次级信息，而不是主任务说明。
- 表单字段必须有关联 label、错误信息与校验状态；仅 placeholder 不算 label。
- 不自动播放、闪烁或连续装饰动画；安全计时器是功能性动画，减少动态时仍保留可读的剩余秒数。

## 7. 实施顺序

1. 新组件直接使用 `--sa-sys-*` 和 `--sa-ext-*` token。
2. 改动既有组件时，将其中的硬编码深色值迁移到对应 token，不改变信息架构或安全流程。
3. 为每个互动组件补齐 hover、focus-visible、pressed、disabled 和 loading 状态。
4. 在 Compact / Medium / Expanded 三种宽度下验收，并用键盘完成核心流程。
5. 通过对比度与减少动态检查后才合入。

## 8. 依据

- Material Design 3 的[色彩系统](https://m3.material.io/styles/color/overview)与[状态层](https://m3.material.io/foundations/interaction/states/overview)。
- Google 的 [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)：本项目 token 生成器使用的开源算法。
- Material 3 的[自适应布局示例](https://m3.material.io/foundations/layout/canonical-examples/overview)。

这是一份以 Google M3 为技术底座、以 SafeAuth 深色终端身份为视觉边界的规范，不构成 Google 官方认证或品牌授权。
