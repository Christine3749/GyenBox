import { MorandiColor, NoteColorId } from "../types";

export const MORANDI_COLORS: MorandiColor[] = [
  {
    id: "default",
    name: "经典白",
    bgLight: "bg-white dark:bg-zinc-900",
    borderLight: "border-zinc-200 dark:border-zinc-800",
    bgDark: "dark:bg-zinc-900",
    borderDark: "dark:border-zinc-800",
    dotBg: "#ffffff",
  },
  {
    id: "rose",
    name: "莫兰迪干玫瑰",
    bgLight: "bg-[#fbe8e7] dark:bg-[#3c2425]",
    borderLight: "border-[#f4d2d0] dark:border-[#523335]",
    bgDark: "dark:bg-[#3c2425]",
    borderDark: "dark:border-[#523335]",
    dotBg: "#fbe8e7",
  },
  {
    id: "apricot",
    name: "莫兰迪杏橙",
    bgLight: "bg-[#fdedd8] dark:bg-[#3d2f21]",
    borderLight: "border-[#f7dbb8] dark:border-[#574330]",
    bgDark: "dark:bg-[#3d2f21]",
    borderDark: "dark:border-[#574330]",
    dotBg: "#fdedd8",
  },
  {
    id: "amber",
    name: "莫兰迪暖黄",
    bgLight: "bg-[#fef7d6] dark:bg-[#3b381e]",
    borderLight: "border-[#f7ebad] dark:border-[#524e29]",
    bgDark: "dark:bg-[#3b381e]",
    borderDark: "dark:border-[#524e29]",
    dotBg: "#fef7d6",
  },
  {
    id: "sage",
    name: "莫兰迪鼠尾草绿",
    bgLight: "bg-[#e4f0e5] dark:bg-[#213324]",
    borderLight: "border-[#cae0cc] dark:border-[#2e4732]",
    bgDark: "dark:bg-[#213324]",
    borderDark: "dark:border-[#2e4732]",
    dotBg: "#e4f0e5",
  },
  {
    id: "mint",
    name: "莫兰迪薄荷清翠",
    bgLight: "bg-[#e1f5f2] dark:bg-[#1d3330]",
    borderLight: "border-[#beeadf] dark:border-[#284743]",
    bgDark: "dark:bg-[#1d3330]",
    borderDark: "dark:border-[#284743]",
    dotBg: "#e1f5f2",
  },
  {
    id: "slate",
    name: "莫兰迪雾蓝",
    bgLight: "bg-[#e2edf8] dark:bg-[#1f2d3a]",
    borderLight: "border-[#c4dbf2] dark:border-[#2c3f52]",
    bgDark: "dark:bg-[#1f2d3a]",
    borderDark: "dark:border-[#2c3f52]",
    dotBg: "#e2edf8",
  },
  {
    id: "lavender",
    name: "莫兰迪香芋紫",
    bgLight: "bg-[#efe6f8] dark:bg-[#2e2338]",
    borderLight: "border-[#dac5f2] dark:border-[#423252]",
    bgDark: "dark:bg-[#2e2338]",
    borderDark: "dark:border-[#423252]",
    dotBg: "#efe6f8",
  },
  {
    id: "sand",
    name: "莫兰迪风化砂石",
    bgLight: "bg-[#f1ece6] dark:bg-[#312e2b]",
    borderLight: "border-[#e0d6cb] dark:border-[#45413c]",
    bgDark: "dark:bg-[#312e2b]",
    borderDark: "dark:border-[#45413c]",
    dotBg: "#f1ece6",
  },
  {
    id: "blush",
    name: "莫兰迪烟粉灰",
    bgLight: "bg-[#f4e9ec] dark:bg-[#33252a]",
    borderLight: "border-[#e6d0d7] dark:border-[#4a353d]",
    bgDark: "dark:bg-[#33252a]",
    borderDark: "dark:border-[#4a353d]",
    dotBg: "#f4e9ec",
  },
];

export function getColorById(colorId: NoteColorId): MorandiColor {
  return (
    MORANDI_COLORS.find((c) => c.id === colorId) || MORANDI_COLORS[0]
  );
}


