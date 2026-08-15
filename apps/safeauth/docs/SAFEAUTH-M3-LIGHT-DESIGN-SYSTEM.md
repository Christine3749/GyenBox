# SafeAuth × Material 3 浅色设计系统

> 版本：1.0 · 模式：Light only · 与 `SAFEAUTH-M3-DARK-DESIGN-SYSTEM.md` 同级  
> 目标：同一安全产品在明亮环境中保持可读、精确、克制；不是深色界面的反相版。

## 1. 主题关系

- 深色与浅色都从 SafeAuth 品牌种子 `#6D5EF5` 生成，使用 Google Material Color Utilities 的 `Tonal Spot` 方案。
- 两套主题共享：信息架构、字号、图标、形状、键盘交互、48px 命中目标、状态层比例、错误语义与动效规则。
- 两套主题不共享：绝对颜色、文字颜色、表面层级、卡片底色与边框对比度。
- 浅色模式不保留任何深黑色区域。顶栏、侧栏和工作区必须属于同一套浅色表面层级。

## 2. 浅色令牌与用途

完整 CSS token 位于 `src/styles/safeauth-m3-light-tokens.css`；下面是产品实现必须首先掌握的角色。

| 角色 | 色号 | 规定用途 |
| --- | --- | --- |
| `background` / `surface` | `#FCF8FF` | 页面背景；不用纯冷白或蓝灰底 |
| `surface-container-lowest` | `#FFFFFF` | 账号卡、主内容卡、需要最高可读性的表面 |
| `surface-container-low` | `#F6F2FA` | 侧栏、工具区、低层分组 |
| `surface-container` | `#F1ECF4` | 输入框、控件组、静态次级容器 |
| `surface-container-high` | `#EBE7EF` | 悬停容器、次级强调面 |
| `surface-container-highest` | `#E5E1E9` | 强分组、禁用容器 |
| `on-surface` | `#1C1B20` | 标题、服务名、验证码、主要图标 |
| `on-surface-variant` | `#47464F` | 副标题、说明、非主要元数据 |
| `outline-variant` | `#C8C5D0` | 默认 1px 边框、分隔线 |
| `outline` | `#787680` | 高强调轮廓与可见焦点附近的边界 |
| `primary` | `#5C5891` | 唯一 Filled 主操作、关键选择与焦点 |
| `on-primary` | `#FFFFFF` | 主按钮文字/图标 |
| `primary-container` | `#E4DFFF` | 已选导航、柔和主色容器 |
| `on-primary-container` | `#444078` | 主色容器中的文字/图标 |
| `error` | `#BA1A1A` | 阻断性错误文本、图标和边框 |
| `error-container` | `#FFDAD6` | 仅用于错误说明区 |

## 3. 分类色使用

分类色保留但降级为局部语义，不再填充整条账号卡。账号卡默认始终为 `surface-container-lowest`（白色）。

| 类别 | 强调色 | 容器色 | 应用位置 |
| --- | --- | --- | --- |
| 工作办公 | `#256489` | `#C9E6FF` | 图标方块、标签、验证码状态点 |
| 云服务 | `#006B5F` | `#9EF2E3` | 同上 |
| 金融理财 | `#226A4C` | `#AAF2CC` | 同上 |
| 开发运维 | `#6F528A` | `#F0DBFF` | 同上 |
| 个人社交 | `#825513` | `#FFDDB8` | 同上 |
| 重点收藏 | `#8F4A50` | `#FFDADB` | 收藏标签与图标，不替代黄色星标 |

**账号行不得整行使用类别容器色。** 需要 hover 或选中反馈时，使用主色状态层或类别容器色的低透明度覆盖；保持服务名与验证码在白色/中性表面上阅读。

## 4. 布局与组件映射

| 组件 | 浅色标准 |
| --- | --- |
| 顶栏 | `surface-container-lowest` 或 `surface-container-low`；底部 `outline-variant` 1px；文字 `on-surface` |
| 侧栏 | `surface-container-low`；不允许保留深黑侧栏 |
| 工作区 | `background`；标题必须为 `on-surface`，不能使用白字 |
| 账号卡 | `surface-container-lowest` + `outline-variant` 1px；hover 到 `surface-container-high` 或 8% 状态层 |
| 搜索与工具组 | `surface-container`；输入文字 `on-surface`，placeholder `on-surface-variant` |
| 已选导航 | `primary-container` + `on-primary-container`；左侧 2px `primary` |
| 主按钮 | `primary` + `on-primary`；不要继续使用深色主题的亮紫 `#C5C0FF` |
| 次级按钮 | 透明或 `surface-container`；使用 `outline-variant` 边框 |
| 模态框 | `surface-container-lowest`；遮罩为黑色 32%–40%，而非深色主题的 80% |
| 审计分数 | 中性表面 + `primary` 数字；风险文本按对应语义色显示 |

## 5. 状态、交互与可访问性

- 状态层与深色一致：hover 8%、focus 12%、pressed 12%、dragged 16%、disabled 内容 38%、disabled 容器 12%。
- `:focus-visible` 使用 `primary` 的 2px 外环，外扩至少 2px；在浅色表面必须清晰可见。
- 所有主体文字使用 `on-surface` 或 `on-surface-variant`，正常文字对比度不低于 4.5:1。
- 冷白背景上不可使用白色标题、浅青色正文或低透明度等宽验证码。
- 浅色主题同样使用等宽的安全系统层；“变亮”不能削弱终端感或降低 TOTP 数字权重。
- 动效、键盘、PIN、复制、隐藏账号、删除确认、TOTP 临期规则全部继承深色标准，不另建一套行为。

## 6. 现有浅色画面的审计（截图）

### 评分：**3.5 / 10**

| 项目 | 得分 | 原因 |
| --- | ---: | --- |
| 可读性 | 2 / 10 | “全部验证账号”和说明文字接近白色，落在 `#EAEFF5` 类浅背景上，首要信息几乎消失。 |
| 主题一致性 | 2 / 10 | 顶栏、侧栏仍为深色，内容区突然转浅；这不是完整浅色主题，而是两套主题拼接。 |
| 信息层级 | 4 / 10 | 账号行和背景的亮度接近，标题区、卡片、工作区难以形成稳定层次。 |
| 分类色纪律 | 3 / 10 | Sky/Teal/Purple/Amber 被铺为整行淡色背景，导致视觉噪声，并削弱类别本应承担的语义。 |
| SafeAuth 品牌连续性 | 6 / 10 | 等宽字体、紧凑列表、图标与布局还在，因此仍能辨认是同一产品。 |

### 根因

1. 当前浅色实现只是将部分 Tailwind `dark:` class 切换到默认浅色值，没有按语义角色重新设计表面、文字和状态。
2. 深色侧栏/顶栏与浅色主体并置，破坏了 Material 主题中同一 elevation/surface 家族的连续性。
3. 标题使用了深色模式的白色前景，缺少 `on-surface` 浅色映射，造成对比度失败。
4. 类别颜色从“局部状态”误用成“大面积卡片底色”，列表的扫描效率下降。

## 7. 浅色验收清单

- [ ] 顶栏、侧栏、主区、卡片全部使用浅色 token，不保留深色大区块。
- [ ] 主标题、服务名、验证码使用 `on-surface`，说明使用 `on-surface-variant`。
- [ ] 默认账号卡为中性白色；分类色只用于局部元素。
- [ ] 主 CTA 使用 `primary #5C5891` 与白字。
- [ ] 每个互动元素具备状态层、2px 焦点环和 48px 命中区。
- [ ] 模态遮罩、禁用态、错误态均采用浅色主题对应角色。
- [ ] 与深色主题在功能、信息架构、键盘操作和动效上保持一致。

本标准与 [SafeAuth 深色 M3 设计系统](./SAFEAUTH-M3-DARK-DESIGN-SYSTEM.md) 是一对主题规范；后续实现必须同时以二者验收。
