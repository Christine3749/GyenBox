import type { CardAccent, CardSize, CardState } from './CanvasCardData';
import { CARD_SIZE_DIM } from './CanvasCardSolidTokens';

export const FONT = '"HarmonyOS Sans SC","HarmonyOS Sans","Inter","PingFang SC","Microsoft YaHei UI",system-ui,sans-serif';
export const LATIN = '"Inter","HarmonyOS Sans",system-ui,sans-serif';
export const BLUE = '#5F74C4';
export const PANEL_BG = 'rgba(248, 249, 252, 0.96)';
export const INK = 'rgba(24, 27, 35, 0.82)';
export const MUTED = 'rgba(24, 27, 35, 0.38)';
export const DIVIDER = 'rgba(24, 27, 35, 0.075)';
export const HOVER = 'rgba(255, 255, 255, 0.76)';
export const PANEL_WIDTH = 344;
export const PANEL_GAP = 14;
export const PANEL_EDGE = 12;
export const PANEL_TOP_OFFSET = -4;
export const PANEL_RADIUS = 6;
export const PANEL_PADDING = '10px 0';
export const PANEL_BORDER = '1px solid rgba(112,121,138,0.18)';
export const PANEL_SHADOW = '0 5px 16px rgba(38,36,52,0.08), 0 1px 2px rgba(38,36,52,0.045), inset 0 1px 0 rgba(255,255,255,0.86)';

export const ACCENTS: { v: CardAccent; bg: string; label: string; empty?: true }[] = [
  { v: '', bg: '#EDF0F6', label: 'none', empty: true },
  { v: 'red', bg: '#B7657A', label: 'red' },
  { v: 'amber', bg: '#B49A50', label: 'amber' },
  { v: 'green', bg: '#779B85', label: 'green' },
  { v: 'blue', bg: '#5F74C4', label: 'blue' },
  { v: 'purple', bg: '#8978BD', label: 'purple' },
  { v: 'black', bg: '#2A2C31', label: 'black' },
];

export const SIZES: { v: CardSize; dim: string }[] = (['S', 'M', 'L'] as CardSize[]).map(v => ({
  v,
  dim: `${CARD_SIZE_DIM[v].w}x${CARD_SIZE_DIM[v].h}`,
}));

export const STATE_OPTIONS: [string, CardState][] = [
  ['Normal', 'normal'],
  ['Highlight', 'highlight'],
  ['Fade', 'fade'],
];
