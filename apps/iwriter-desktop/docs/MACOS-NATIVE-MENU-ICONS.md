# macOS 原生菜单图标实施记录

本文记录 iWriter `Format` 菜单图标从空白、过大、深色模式发黑，到最终正确显示的完整过程。以后新增或修改原生菜单图标，应优先按本文操作和验收。

## 结论

`Format` 不是网页里的浮层菜单，而是 Electron 主进程创建、最终交给 macOS AppKit 绘制的原生 `NSMenu`。因此 React、CSS、网页 SVG 和普通图标组件都不会控制它。

最终稳定的渲染链路是：

```text
16 × 16 SVG 源图
  → Sharp 生成 32 × 32 Retina PNG
  → Electron nativeImage.createFromPath()
  → resize 到 16 × 16 逻辑尺寸
  → 单色图标设为 Template Image
  → 创建 MenuItem 时写入 icon
  → macOS NSMenuItem 绘制
```

单色图标由 macOS 根据浅色、深色、禁用和选中状态自动着色。`Highlight` 是例外：它保留黄色下划线，因此不能作为纯 Template Image 处理。

## 为什么普通图标容易，Format 图标困难

普通界面图标位于网页 DOM 内，浏览器能够直接处理 SVG、CSS 尺寸、颜色和主题。修改后刷新页面即可看到结果。

原生菜单图标跨越了四层：

1. SVG 源图和字体轮廓。
2. Electron `nativeImage` 的位图解码与缩放。
3. Electron `MenuItem` 到 AppKit `NSMenuItem` 的桥接。
4. macOS 的 Retina、Template Image 和原生菜单绘制规则。

任意一层看似成功，都不等于最终屏幕上存在有效像素。例如原生桥返回 `true`，只说明 `NSImage` 对象已赋值，不说明菜单真正绘制出了图标。

## 这次为什么改了很多次

### 第一次：把字体字符或 SVG Data URL 直接交给 nativeImage

代码能够创建对象，但 macOS 应用菜单没有可靠地栅格化这条 SVG 路径，结果是菜单预留了图标区域却显示空白。

教训：原生菜单不要把 SVG Data URL 当作最终资产；先生成真实 PNG。

### 第二次：通过 Objective-C++ 桥直接给 NSMenuItem 设置 NSImage

日志显示 22/22 成功，对象也能被查询到，但用户界面仍然空白。这里验证的是“对象存在”，不是“最终像素可见”。

教训：桥接层的成功计数只能作为诊断信息，不能代替视觉验收。

### 第三次：生成 Retina PNG，但在菜单创建后补写图标

PNG 已经正确，然而后置修改不属于 Electron 最初建立的菜单模型。Electron 或 macOS 重建菜单后，结果可能丢失或没有进入最终绘制路径。

教训：不要把原生桥的事后注入作为主实现；图标应在 `Menu.buildFromTemplate()` 创建项目时绑定。

### 第四次：创建 MenuItem 时直接绑定 PNG

这次图标终于全部出现，但 32 × 32 PNG 被当成了过大的逻辑尺寸，而且深色模式中仍呈黑色。

教训：Retina 像素尺寸和菜单逻辑尺寸不是一回事；必须显式缩放为 16 × 16，并声明 Template Image。

### 最终方案

使用 32 × 32 PNG 保存 Retina 细节；加载后缩放为 16 × 16 逻辑尺寸；除 `Highlight` 外调用 `setTemplateImage(true)`；在创建每个菜单项时赋给 `icon`。

这就是当前截图中图标大小、基线、浅深色适配都正确的原因。

## 代码入口

- 图标造型及 Retina PNG 生成：`scripts/build-menu-icons.mjs`
- 生成结果：`electron/assets/menu-icons/*.png`
- 菜单加载、16pt 缩放及 Template Image：`electron/main.cjs` 中的 `nativeFormatIcon()`
- Format 菜单结构：`electron/main.cjs` 中的 `installApplicationMenu()`
- 原生诊断和 Focus 文字颜色桥：`electron/native/menu-style.mm`
- 原生构建：`scripts/build-menu-native.mjs`
- 构建入口：`package.json` 中的 `native:build`

## 下次新增一个 Format 图标

1. 在 `scripts/build-menu-icons.mjs` 的 `icons` 中增加菜单英文标签及 SVG。标签必须与 `electron/main.cjs` 里的菜单 `label` 完全一致。
2. 在 `electron/main.cjs` 的 `FORMAT_MENU_ICONS` 注册同一标签。目前这里也保留 SVG 描述供菜单识别和原生诊断使用。
3. 单色图标统一使用纯黑轮廓作为源图，交给 Template Image 自动适配主题。确实需要保留颜色的图标，必须在 `nativeFormatIcon()` 中明确列为非 Template Image。
4. 运行：

   ```sh
   npm --workspace @gyenbox/iwriter-desktop run native:build
   ```

5. 确认 `electron/assets/menu-icons/` 中出现对应的 32 × 32 PNG。
6. 启动本地桌面端并在真实 macOS 菜单中检查，不要只看网页预览或终端日志：

   ```sh
   npm run iwriter-desktop:dev
   ```

7. 同时检查浅色和深色模式，再执行测试与打包。
8. 每个需要交付或安装验证的包都递增版本号，避免同名 DMG、旧 App 或缓存造成误判。

## 图标绘制标准

- SVG 画布：16 × 16，输出 PNG：32 × 32。
- 菜单逻辑尺寸：16 × 16。
- 主要线宽建议：1.2–1.4；当前基准为 1.35。
- `stroke-linecap` 与 `stroke-linejoin` 使用 `round`。
- 图形视觉中心应位于画布中心，不能只依赖数学边界居中。
- 不使用 emoji 作为原生菜单图标；不同系统字体会改变字形、基线和粗细。
- 不通过加大图标来追求清晰度；清晰度来自 Retina PNG，秀气感来自正确的逻辑尺寸与线宽。

## 打包前验收清单

- [ ] 所有需要图标的菜单项均可见，没有空白占位。
- [ ] 图标为 16pt，未把菜单行高撑大。
- [ ] 图标与文字基线和左边距统一。
- [ ] 浅色模式中轮廓清晰。
- [ ] 深色模式中单色图标自动变亮，没有黑块。
- [ ] `Highlight` 的黄色下划线保留，文字部分仍清晰。
- [ ] 禁用、悬停、选中和子菜单状态正常。
- [ ] 快捷键、分隔线和子菜单箭头未被图标挤压。
- [ ] 开发版与打包后的 App 都实际打开检查过。
- [ ] About 中版本号与 DMG 文件名一致。
- [ ] 打包完成后 `release/mac*` 中间 App 已被清理，Launchpad 只索引 `/Applications/iWriter.app`。

## 故障定位

图标完全不出现：

- 检查 PNG 是否真实存在并被打入应用资源。
- 检查标签是否与菜单项完全一致。
- 检查 `nativeImage.isEmpty()`，并确认图标是在菜单模型创建时绑定，而不是之后补写。

深色模式仍为黑色：

- 检查是否遗漏 `setTemplateImage(true)`。
- 如果图标包含品牌色，不能使用整张 Template Image，需要拆分或接受固定配色。

图标出现但显得肥大：

- 检查是否把 32 × 32 Retina 像素直接当作 32pt 使用。
- 在赋给菜单前统一 `resize({ width: 16, height: 16 })`。

日志成功但界面空白：

- 日志只能证明某个中间对象存在。
- 以运行中的真实 macOS 菜单截图作为最终证据。

## 平台边界

这套链路只服务 macOS 原生应用菜单。Windows 和网页内部菜单不经过 AppKit，应继续使用对应平台的 SVG/React 图标系统；可以共享造型规范，但不能照搬 `NSMenuItem`、Retina 和 Template Image 的实现。
