# GyenBox VI Logo Notes

## 2026-06-28 Desktop Tray Icon Adjustment

### 背景

GyenBox 最终主 Logo 已确定为 3D 盒子 + 正面 `G` + 侧面 `Y` 的版本。主 Logo 用于：

- Web 品牌图
- favicon / app icon
- Desktop 顶部品牌图
- Windows installer icon
- Explorer / shell 入口图标

所有正式 PNG / ICO 必须是真透明背景：

- PNG 使用 `RGBA`
- ICO 含 16 / 24 / 32 / 48 / 64 / 128 / 256 尺寸
- 四角 alpha 必须为 `0`

### 已试过的托盘尺寸参数

Desktop 主进程 `createTrayIcon()` 之前尝试过修改 Electron 托盘图标显示尺寸：

- `24 -> 30`
- `30 -> 34`
- `34 -> 38`

结果：视觉变化很小。

判断：Windows taskbar / tray 会把最终图标压进系统自己的固定槽位。继续把 `nativeImage.resize()` 的尺寸调大，收益很低，甚至可能没有明显变化。

### 正确方向

托盘图标不应该靠加大 `TRAY_ICON_SIZE` 解决。正确逻辑是：

1. `TRAY_ICON_SIZE` 回到 `24`。
2. 保持透明背景。
3. 单独生成 tray-only 资源：`apps/desktop/build/tray-icon.png`。
4. 在 24px 画布逻辑下，让图形本体占比更大。
5. 主 Logo 不因此变形；只针对小尺寸托盘图做视觉优化。

也就是说，不是把显示尺寸变大，而是在固定 24px 画面里把 logo 画得更满。

### 当前实现约定

- 主 app icon：`apps/desktop/build/icon.png` / `icon.ico`
- 托盘专用 icon：`apps/desktop/build/tray-icon.png`
- Electron tray 优先加载顺序：
  1. `tray-icon.png`
  2. `icon.png`
  3. `icon.ico`

`tray-icon.png` 可以比主 app icon 更激进地裁切、放大，但必须满足：

- 背景透明
- 不引入黑底
- 不改主 Logo 文件
- 不影响 Web / installer / Explorer 的正式品牌图

### 这次修正

这次把 `TRAY_ICON_SIZE` 改回 `24`，并重新生成 `tray-icon.png`：

- 仍然使用透明画布
- 从主 Logo alpha 区域裁切
- 在 512px 源画布中轻微放大后居中裁切
- 目标是让它缩到 24px 后，比普通 app icon 更有存在感

### 后续判断标准

和微信、V2ray 这类满色块图标相比，GyenBox 透明 3D 异形图标天然会显得更小。更合理的对标对象是 Dropbox：同样是透明异形图标。

如果仍觉得小，下一步不要再调 `TRAY_ICON_SIZE`，而应该做一个更简化、更粗轮廓的 tray-only 小图标版本。

### 2026-06-28 Final Verification

本次最终落地状态：

- `TRAY_ICON_SIZE = 24`
- `apps/desktop/build/tray-icon.png` 为 tray-only 透明 PNG
- 输出尺寸：`512 x 512`
- alpha bbox：`(1, 0, 511, 512)`，内容占比约 `510 x 512`
- 四角 alpha：`0, 0, 0, 0`
- 打包后资源：`apps/desktop/release/win-unpacked/resources/tray-icon.png`
- 打包后资源与开发资源一致

验证：

- `npm --workspace @gyenbox/desktop run typecheck` passed
- `npm --workspace @gyenbox/desktop run build` passed
- `npm --workspace @gyenbox/desktop run pack:win` passed

安装包：

- `apps/desktop/release/GyenBox-Setup-0.1.20-x64.exe`
- Size: `103,560,933 bytes`
- SHA256: `BC1AB2BDF80D7D70E4064023D7BB72ABC15ABD54F605BDDBC314A6B2EC5D4930`


