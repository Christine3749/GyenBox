import { NoteColor } from '@/types';

export interface ColorOption {
  id: NoteColor;
  name: string;
  bgClass: string; // light mode
  darkBgClass: string; // dark mode
  borderClass: string;
  hexLight: string;
  hexDark: string;
}

export const NOTE_COLORS: Record<NoteColor, ColorOption> = {
  default: {
    id: 'default',
    name: 'Default',
    bgClass: 'bg-white text-gray-800 dark:bg-zinc-800 dark:text-zinc-100',
    darkBgClass: 'dark:bg-zinc-800 dark:text-zinc-100',
    borderClass: 'border-zinc-200 dark:border-zinc-700',
    hexLight: '#ffffff',
    hexDark: '#202124',
  },
  red: {
    id: 'red',
    name: 'Coral / Red',
    bgClass: 'bg-[#f28b82] text-gray-900 dark:bg-[#5c2b29] dark:text-red-100',
    darkBgClass: 'dark:bg-[#5c2b29] dark:text-red-100',
    borderClass: 'border-red-300 dark:border-red-900/40',
    hexLight: '#f28b82',
    hexDark: '#5c2b29',
  },
  orange: {
    id: 'orange',
    name: 'Peach / Orange',
    bgClass: 'bg-[#fbbc04] text-gray-900 dark:bg-[#614a19] dark:text-amber-100',
    darkBgClass: 'dark:bg-[#614a19] dark:text-amber-100',
    borderClass: 'border-amber-300 dark:border-amber-900/40',
    hexLight: '#fbbc04',
    hexDark: '#614a19',
  },
  yellow: {
    id: 'yellow',
    name: 'Sand / Yellow',
    bgClass: 'bg-[#fff475] text-gray-900 dark:bg-[#635d19] dark:text-yellow-100',
    darkBgClass: 'dark:bg-[#635d19] dark:text-yellow-100',
    borderClass: 'border-yellow-300 dark:border-yellow-900/40',
    hexLight: '#fff475',
    hexDark: '#635d19',
  },
  green: {
    id: 'green',
    name: 'Mint / Green',
    bgClass: 'bg-[#ccff90] text-gray-900 dark:bg-[#344926] dark:text-emerald-100',
    darkBgClass: 'dark:bg-[#344926] dark:text-emerald-100',
    borderClass: 'border-emerald-300 dark:border-emerald-900/40',
    hexLight: '#ccff90',
    hexDark: '#344926',
  },
  teal: {
    id: 'teal',
    name: 'Teal / Sage',
    bgClass: 'bg-[#a7ffeb] text-gray-900 dark:bg-[#16504b] dark:text-teal-100',
    darkBgClass: 'dark:bg-[#16504b] dark:text-teal-100',
    borderClass: 'border-teal-300 dark:border-teal-900/40',
    hexLight: '#a7ffeb',
    hexDark: '#16504b',
  },
  blue: {
    id: 'blue',
    name: 'Fog / Blue',
    bgClass: 'bg-[#cbf0f8] text-gray-900 dark:bg-[#2d555e] dark:text-cyan-100',
    darkBgClass: 'dark:bg-[#2d555e] dark:text-cyan-100',
    borderClass: 'border-cyan-300 dark:border-cyan-900/40',
    hexLight: '#cbf0f8',
    hexDark: '#2d555e',
  },
  purple: {
    id: 'purple',
    name: 'Dusk / Purple',
    bgClass: 'bg-[#d7aefb] text-gray-900 dark:bg-[#42275d] dark:text-purple-100',
    darkBgClass: 'dark:bg-[#42275d] dark:text-purple-100',
    borderClass: 'border-purple-300 dark:border-purple-900/40',
    hexLight: '#d7aefb',
    hexDark: '#42275d',
  },
  pink: {
    id: 'pink',
    name: 'Blossom / Pink',
    bgClass: 'bg-[#fdaffc] text-gray-900 dark:bg-[#5b2245] dark:text-pink-100',
    darkBgClass: 'dark:bg-[#5b2245] dark:text-pink-100',
    borderClass: 'border-pink-300 dark:border-pink-900/40',
    hexLight: '#fdaffc',
    hexDark: '#5b2245',
  },
  brown: {
    id: 'brown',
    name: 'Clay / Brown',
    bgClass: 'bg-[#e6c9a8] text-gray-900 dark:bg-[#443729] dark:text-orange-100',
    darkBgClass: 'dark:bg-[#443729] dark:text-orange-100',
    borderClass: 'border-amber-400/40 dark:border-amber-950/40',
    hexLight: '#e6c9a8',
    hexDark: '#443729',
  },
  gray: {
    id: 'gray',
    name: 'Chalk / Gray',
    bgClass: 'bg-[#e8eaed] text-gray-900 dark:bg-[#3c4043] dark:text-zinc-100',
    darkBgClass: 'dark:bg-[#3c4043] dark:text-zinc-100',
    borderClass: 'border-zinc-300 dark:border-zinc-600',
    hexLight: '#e8eaed',
    hexDark: '#3c4043',
  },
};
