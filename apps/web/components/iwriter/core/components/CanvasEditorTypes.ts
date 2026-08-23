/** CanvasEditorTypes — 类型、常量、调色板 */

import { shellPlatform } from '../hooks/useShellPlatform';

export type EditorMode = 'write' | 'preview' | 'split';
export type FocusMode  = 'off'   | 'paragraph' | 'sentence';
export type MenuId     = 'file'  | 'edit' | 'format' | 'focus' | 'authors' | 'view' | 'help' | null;
export type LineLen    = 64 | 72 | 80;
export type FontChoice = 'mono' | 'quattro';

export type MenuItem = {
  label: string; shortcut?: string;
  action?: () => void; checked?: boolean; disabled?: boolean; color?: string;
  icon?: string; indicator?: 'dash'; submenu?: (MenuItem | '---')[];
};
export type MenuSpec = { id: MenuId; label: string; items: (MenuItem | '---')[] };

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS 调色板 — iA Writer 标准（锁定，勿随意改动）
//
// 设计原则（来自 iA Writer）：
//   Dark  — chrome = bg，全局统一黑，中性灰文字，无暖色分量
//   Light — bg 中性浅灰（R=G=B），chrome 略深一档，写作区与工具区有层次
//   Accent — 单一蓝，其余一律灰阶，绝不引入第二彩色
//   Border — 仅用于分层，对比度控制在最低可见阈值
// ─────────────────────────────────────────────────────────────────────────────

export type Palette = {
  bg: string; chrome: string; panel: string; fg: string; menuFg: string; menuFgHover: string;
  menuBg: string; menuHover: string; menuBorder: string; menuSep: string;
  border: string; accent: string; dim: string;
};

export const DARK: Palette = {
  bg:          '#181818',  // 写作纸面：中性炭黑
  chrome:      '#161717',  // 主门楣：只比纸面深半阶
  panel:       '#111212',  // 文件栏：最深的结构层
  fg:          '#D1D1CF',  // 正文：微暖灰白，避免蓝白刺眼
  menuFg:      '#92928F',  // 二级文字与静止控件
  menuFgHover: '#D8D8D5',  // 高亮文字
  menuBg:      '#202121',  // 浮层：从黑底抬起一阶
  menuHover:   '#292A2A',  // 浮层 hover
  menuBorder:  '#343535',  // 浮层轮廓
  menuSep:     '#292A2A',  // 浮层分隔线
  border:      '#272828',  // 面板发丝线
  accent:      '#2FA7D8',  // 冷蓝只用于选择与光标
  dim:         '#6F706D',  // 三级文字
};

export const LIGHT: Palette = {
  bg:          '#FBFAF7',  // 写作纸面：带一点暖度，避免纯白眩光
  chrome:      '#F4F3F0',  // 门楣 / 文件栏：与纸面拉开极轻的材质层次
  panel:       '#F4F3F0',
  fg:          '#242424',  // 正文：柔和近黑
  menuFg:      '#5F5C58',  // 静止态不争抢正文
  menuFgHover: '#242424',
  menuBg:      '#FAF9F6',
  menuHover:   '#ECEAE6',
  menuBorder:  '#DDDAD4',
  menuSep:     '#E7E4DE',
  border:      '#DFDDD8',  // 低对比度发丝线
  accent:      '#249FE7',  // GyenBox 蓝：仅用于焦点、选择和光标
  dim:         '#8C8882',
};

export const TITLE_H  = 32;
export const MENU_H   = 28;
export const CHROME_H = TITLE_H + MENU_H;
export const MAC_TITLE_H = 60;
export const STATUS_H = 22;
export const MAC_TRAFFIC_LIGHT_INSET = 74;

export function getMacTitlebarInsets(mac: boolean, fullscreen: boolean, sidebarOpen: boolean) {
  const inset = mac && !fullscreen ? MAC_TRAFFIC_LIGHT_INSET : 0;
  return {
    library: sidebarOpen ? inset : 0,
    chrome: sidebarOpen ? 0 : inset,
  };
}

/** 行宽三档 → 内容区最大宽度 px */
export const LINE_W: Record<LineLen, number> = { 64: 620, 72: 700, 80: 780 };

export const SYS_FONT =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

export const isElectron = shellPlatform.isElectron;
export const isMac      = shellPlatform.isMac;
