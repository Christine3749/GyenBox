/** CanvasEditorTypes — 类型、常量、调色板 */

import { shellPlatform } from '../hooks/useShellPlatform';

export type EditorMode = 'write' | 'preview' | 'split';
export type FocusMode  = 'off'   | 'paragraph' | 'sentence';
export type MenuId     = 'file'  | 'edit' | 'format' | 'focus' | 'authors' | 'view' | 'help' | null;
export type LineLen    = 64 | 72 | 80;
export type FontChoice = 'mono' | 'quattro';

export type MenuItem = {
  label: string; shortcut?: string;
  action?: () => void; checked?: boolean; disabled?: boolean;
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
  bg: string; chrome: string; fg: string; menuFg: string; menuFgHover: string;
  menuBg: string; menuHover: string; menuBorder: string; menuSep: string;
  border: string; accent: string; dim: string;
};

export const DARK: Palette = {
  bg:          '#1A1A1A',  // 写作区背景 = chrome 背景，完全统一，消除色带
  chrome:      '#1A1A1A',  // 标题栏 / 菜单栏，与 bg 相同
  fg:          '#CCCCCC',  // 正文：中性灰，R=G=B，无暖色
  menuFg:      '#666666',  // 菜单标签静止态：低调，不抢正文
  menuFgHover: '#CCCCCC',  // 菜单 hover：与正文色一致
  menuBg:      '#232323',  // 下拉背景：比 bg 略亮，R=G=B
  menuHover:   '#2C2C2C',  // 菜单项 hover fill
  menuBorder:  '#333333',  // 下拉边框
  menuSep:     '#282828',  // 分隔线
  border:      '#252525',  // 区域分割线：刚好可见，不抢戏
  accent:      '#4A90D9',  // 唯一彩色：蓝，聚焦 / 链接 / 选中
  dim:         '#555555',  // 辅助信息：字数、模式指示
};

export const LIGHT: Palette = {
  bg:          '#FBFAF7',  // 写作纸面：带一点暖度，避免纯白眩光
  chrome:      '#F4F3F0',  // 门楣 / 文件栏：与纸面拉开极轻的材质层次
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
