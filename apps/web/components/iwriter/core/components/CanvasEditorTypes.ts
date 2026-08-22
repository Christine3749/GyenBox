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
  bg:          '#F8F8F8',  // 写作区：中性浅灰（R=G=B=248），比 chrome 亮一档，纸感
  chrome:      '#F9F8F6',  // 侧边栏 / 标题栏：清亮暖白（249,248,246），接近白带微暖
  fg:          '#1A1A1A',  // 正文：近黑，饱和阅读对比
  menuFg:      '#3D3D3D',  // 菜单标签静止态：接近正文色，清晰可读
  menuFgHover: '#1A1A1A',  // hover 变全黑
  menuBg:      '#F5F5F5',  // 下拉背景
  menuHover:   '#E8E8E8',  // 菜单项 hover fill
  menuBorder:  '#E0E0E0',  // 下拉边框
  menuSep:     '#E8E8E8',  // 分隔线
  border:      '#D8D8D8',  // 区域分割线：加深，在 #EFEFEF 背景上清晰可见
  accent:      '#1A6ECC',  // 唯一彩色：蓝（比 dark 饱和度略高）
  dim:         '#AAAAAA',  // 辅助信息
};

export const TITLE_H  = 32;
export const MENU_H   = 28;
export const CHROME_H = TITLE_H + MENU_H;
export const STATUS_H = 22;

/** 行宽三档 → 内容区最大宽度 px */
export const LINE_W: Record<LineLen, number> = { 64: 620, 72: 700, 80: 780 };

export const SYS_FONT =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

export const isElectron = shellPlatform.isElectron;
export const isMac      = shellPlatform.isMac;
