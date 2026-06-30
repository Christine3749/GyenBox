import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const nsisDir = join(repoRoot, "node_modules", "app-builder-lib", "templates", "nsis");
const messagesPath = join(nsisDir, "messages.yml");
const installSectionPath = join(nsisDir, "installSection.nsh");

const messageReplacements = [
  {
    from: [
      "  en: Installing, please wait...",
      '  en: "Preparing your GyenBox space...\\nLocal folder, Quick Access, and sync badges are being connected."',
    ],
    to: '  en: "Preparing GyenBox..."',
  },
  {
    from: [
      "  zh_CN: 正在安装, 请稍候...",
      '  zh_CN: "正在准备你的 GyenBox 空间...\\n本地文件夹、快速访问和同步标记正在连接。"',
    ],
    to: '  zh_CN: "正在准备 GyenBox..."',
  },
  {
    from: [
      "  zh_TW: 正在安裝, 請稍候...",
      '  zh_TW: "正在準備你的 GyenBox 空間...\\n本地資料夾、快速存取和同步標記正在連接。"',
    ],
    to: '  zh_TW: "正在準備 GyenBox..."',
  },
];

const progressPatchAnchor = '    SendMessage $0 ${WM_SETTEXT} 0 "STR:$(installing)"';
const progressPatch = `${progressPatchAnchor}

    ; GyenBox brand polish for the one-click SpiderBanner progress bar.
    FindWindow $R0 "#32770" "" $hwndparent
    FindWindow $R0 "#32770" "" $hwndparent $R0
    FindWindow $R1 "msctls_progress32" "" $R0
    IntCmp $R1 0 gyenbox_progress_done gyenbox_progress_done 0
    System::Call 'uxtheme::SetWindowTheme(p r1, w " ", w " ")'
    SendMessage $R1 0x0409 0 0x00FF8D6A
    gyenbox_progress_done:`;

async function patchMessages() {
  let text = await readFile(messagesPath, "utf8");
  let changed = false;

  for (const { from, to } of messageReplacements) {
    if (text.includes(to)) continue;

    const match = from.find((candidate) => text.includes(candidate));
    if (!match) {
      throw new Error(`NSIS message template did not contain any expected line for ${to}`);
    }

    text = text.replace(match, to);
    changed = true;
  }

  if (changed) {
    await writeFile(messagesPath, text, "utf8");
  }

  return changed;
}

async function patchProgressBar() {
  let text = await readFile(installSectionPath, "utf8");

  if (text.includes("GyenBox brand polish")) {
    return false;
  }

  if (!text.includes(progressPatchAnchor)) {
    throw new Error("NSIS install section template did not contain the expected progress text anchor.");
  }

  text = text.replace(progressPatchAnchor, progressPatch);
  await writeFile(installSectionPath, text, "utf8");
  return true;
}

const messagesChanged = await patchMessages();
const progressChanged = await patchProgressBar();

console.log(
  `[patch-nsis-installer] messages=${messagesChanged ? "patched" : "already-patched"} progress=${progressChanged ? "patched" : "already-patched"}`,
);
