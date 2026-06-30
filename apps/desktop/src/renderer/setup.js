const desktop = window.gyenboxDesktop;

const progressFill = document.querySelector("#progressFill");
const progressPct = document.querySelector("#progressPct");
const progressLabel = document.querySelector("#progressLabel");
const statusLine = document.querySelector("#statusLine");
const statusText = document.querySelector("#statusText");
const setupTitle = document.querySelector("#setupTitle");
const setupLead = document.querySelector("#setupLead");
const footerText = document.querySelector("#footerText");
const warningList = document.querySelector("#warningList");
const retryButton = document.querySelector("#retryButton");
const whyButton = document.querySelector("#whyButton");
const stages = [...document.querySelectorAll("[data-stage]")];
const languageButtons = [...document.querySelectorAll("[data-lang]")];
const copyNodes = [...document.querySelectorAll("[data-copy]")];
const progressRow = document.querySelector(".progress-row");
const locationGate = document.querySelector("#locationGate");
const gatePath = document.querySelector("#gatePath");
const readyPath = document.querySelector("#readyPath");
const changeLocationButton = document.querySelector("#changeLocationButton");
const startSetupButton = document.querySelector("#startSetupButton");
const doneActions = document.querySelector("#doneActions");
const openFolderButton = document.querySelector("#openFolderButton");

let gateActive = false;
let completedWithWarnings = false;
let currentSyncFolder = "";
const warningItems = [];
const warningKeys = new Set();

const stageMap = {
  folder: "choose",
  quick: "integrate",
  cloud: "integrate",
  shell: "integrate",
  provider: "integrate",
  engine: "integrate",
  done: "done",
};

const progressLabels = {
  en: {
    folder: "LOCAL FOLDER",
    quick: "SIDEBAR",
    cloud: "SYNC ROOT",
    shell: "WINDOWS INTEGRATION",
    provider: "SYNC BADGES",
    engine: "FILE SCAN",
    done: "READY",
  },
  zh: {
    folder: "LOCAL FOLDER",
    quick: "SIDEBAR",
    cloud: "SYNC ROOT",
    shell: "WINDOWS INTEGRATION",
    provider: "SYNC BADGES",
    engine: "FILE SCAN",
    done: "READY",
  },
};

const staticCopy = {
  en: {
    kicker: "GYENBOX / SETUP",
    brandLead: "local first sync",
    stageInstallTitle: "Install app",
    stageInstallLead: "App files are installed separately.",
    stageChooseTitle: "Choose folder",
    stageChooseLead: "Sync space stays separate from install path.",
    stageIntegrateTitle: "Connect Windows",
    stageIntegrateLead: "Explorer sidebar, badges, background sync.",
    stageDoneTitle: "Confirm finish",
    stageDoneLead: "Open the folder when you are ready.",
    footerWaiting: "Install path and sync folder stay separate.",
    footerOpening: "GyenBox is ready. Open your folder to continue.",
    footerWarning: "Setup finished with warnings. GyenBox will keep repairing in the background.",
    footerError: "Setup needs attention. You can retry without reinstalling.",
    retry: "Retry",
    why: "Why GyenBox?",
    gateLabel: "Sync folder",
    changeLocation: "Change",
    startSetupButton: "Start setup",
    openFolderButton: "Open GyenBox",
    readyLabel: "Ready folder",
    gateTitle: "Choose your GyenBox folder",
    gateLead: "This is where synced files live. Pick a roomy location, for example D:\\GyenBox.",
    gateFooter: "The app is installed separately. This folder is only for your files.",
  },
  zh: {
    kicker: "GYENBOX / SETUP",
    brandLead: "本地优先同步",
    stageInstallTitle: "安装应用",
    stageInstallLead: "程序固定安装，文件夹稍后选择。",
    stageChooseTitle: "选择文件夹",
    stageChooseLead: "同步空间与安装路径分离。",
    stageIntegrateTitle: "接入 Windows",
    stageIntegrateLead: "侧边栏入口、状态标记、后台同步。",
    stageDoneTitle: "完成确认",
    stageDoneLead: "由你决定何时打开文件夹。",
    footerWaiting: "安装路径和同步文件夹会保持分离。",
    footerOpening: "GyenBox 已准备好。你可以打开文件夹继续。",
    footerWarning: "设置已完成，但有少量提醒。GyenBox 会在后台继续修复。",
    footerError: "设置需要处理一下。无需重装，直接重试即可。",
    retry: "重试",
    why: "为什么是 GyenBox?",
    gateLabel: "同步文件夹",
    changeLocation: "更改",
    startSetupButton: "开始设置",
    openFolderButton: "打开 GyenBox",
    readyLabel: "已准备好",
    gateTitle: "选择 GyenBox 文件夹",
    gateLead: "这里存放你的同步文件。建议放在空间充足的位置，例如 D:\\GyenBox。",
    gateFooter: "应用会固定安装到系统应用目录。这个位置只存放你的文件。",
  },
};

const copyByStep = {
  en: {
    folder: {
      title: "Preparing your local space",
      lead: "GyenBox is creating the folder you chose and keeping it separate from the app install path.",
    },
    quick: {
      title: "Putting GyenBox within reach",
      lead: "GyenBox is being added to Explorer before sync badges connect.",
    },
    cloud: {
      title: "Creating the sync root",
      lead: "Windows is registering this folder as your GyenBox local workspace.",
    },
    shell: {
      title: "Connecting Windows",
      lead: "Explorer actions and sync badges are being installed quietly.",
    },
    provider: {
      title: "Starting sync badges",
      lead: "The background bridge is connecting so Explorer can show file status.",
    },
    engine: {
      title: "Scanning your files",
      lead: "GyenBox is reading the local folder and preparing background sync.",
    },
    done: {
      title: "GyenBox is ready",
      lead: "Your local sync space is ready. Background sync will keep running from the tray.",
    },
  },
  zh: {
    folder: {
      title: "正在准备本地空间",
      lead: "GyenBox 正在创建你选择的文件夹，并让它和应用安装路径保持分离。",
    },
    quick: {
      title: "正在放到顺手的位置",
      lead: "GyenBox 正在加入 Explorer 侧边栏，并准备同步状态标记。",
    },
    cloud: {
      title: "正在创建同步根",
      lead: "Windows 正在把这个文件夹注册为你的 GyenBox 本地空间。",
    },
    shell: {
      title: "正在接入 Windows",
      lead: "Explorer 右键操作与同步标记正在安静安装。",
    },
    provider: {
      title: "正在启动同步标记",
      lead: "后台桥接层正在连接，让 Explorer 能显示文件状态。",
    },
    engine: {
      title: "正在扫描你的文件",
      lead: "GyenBox 正在读取本地文件夹，并准备后台同步。",
    },
    done: {
      title: "GyenBox 已准备好",
      lead: "你的本地同步空间已经创建完成。后台同步会留在托盘中继续工作。",
    },
  },
};

const statusCopy = {
  zh: {
    "Starting setup...": "正在启动设置...",
    "Restarting setup...": "正在重新执行设置...",
    "Setup failed.": "设置失败。",
    "Preparing your space...": "正在准备你的空间...",
    "Preparing Explorer sidebar...": "正在准备 Explorer 侧边栏...",
    "Preparing your secure workspace...": "正在准备你的安全工作区...",
    "Installing Explorer integration...": "正在安装 Explorer 集成...",
    "Connecting sync badges...": "正在连接同步标记...",
    "Scanning your files...": "正在扫描你的文件...",
    "Ready.": "已准备好。",
    "Explorer sidebar did not confirm the pin yet.": "Explorer 侧边栏入口会继续在后台确认。",
    "Cloud provider helper is not running yet.": "同步标记助手暂时没有启动，GyenBox 会在后台继续连接。",
    "Cloud provider did not connect within setup timeout.": "同步标记暂时没有连接成功，GyenBox 会在后台继续连接。",
  },
};

const completedStages = new Set();
const initialPct = readInitialProgress();
const initialLang = readInitialLanguage();
if (initialPct >= 55) completedStages.add("install");
let lastPct = initialPct;
let started = false;
let activeLang = initialLang;
let currentProgress = {
  id: "folder",
  label: initialPct > 0 ? "Preparing your space..." : "Starting setup...",
  pct: initialPct,
  status: "running",
};

function renderProgress(progress) {
  currentProgress = progress;
  if (gateActive && started) hideLocationGate();

  const pct = clamp(Math.max(lastPct, Number(progress.pct) || 0), 0, 100);
  lastPct = pct;
  progressFill.style.width = `${pct}%`;
  progressPct.textContent = `${Math.round(pct)}%`;
  progressLabel.textContent = progressLabels[activeLang][progress.id] ?? "SETUP";

  renderLocalizedCopy(progress);

  statusText.textContent = localizedStatusText(progress);
  statusLine.classList.toggle("done", progress.status === "ok" && progress.id === "done");
  statusLine.classList.toggle("warning", progress.status === "warning");
  statusLine.classList.toggle("error", progress.status === "error");

  const activeStage = stageMap[progress.id] ?? "choose";
  if (progress.status === "ok" || progress.status === "warning") {
    completedStages.add(activeStage);
  }

  if (progress.warning) addWarning(progress.label, progress.warning);
  const isComplete = progress.id === "done" && progress.status === "ok";
  document.body.classList.toggle("setup-complete", isComplete);

  if (progress.status === "error") {
    document.body.classList.remove("setup-complete");
    retryButton.classList.remove("hidden");
    footerText.textContent = staticCopy[activeLang].footerError;
  }

  if (isComplete) {
    completedStages.add("done");
    completedWithWarnings = warningItems.length > 0;
    footerText.textContent = completedWithWarnings
      ? staticCopy[activeLang].footerWarning
      : staticCopy[activeLang].footerOpening;
    doneActions?.classList.remove("hidden");
    if (readyPath && currentSyncFolder) readyPath.textContent = currentSyncFolder;
  }

  updateStageView(activeStage, progress.status);
}

function renderLocalizedCopy(progress = currentProgress) {
  const ui = staticCopy[activeLang];
  for (const node of copyNodes) {
    const key = node.dataset.copy;
    node.textContent = ui[key] ?? node.textContent;
  }
  retryButton.textContent = ui.retry;
  whyButton.textContent = ui.why;
  renderWarnings();

  if (progress.status === "error") {
    footerText.textContent = ui.footerError;
  } else if (progress.id === "done" && progress.status === "ok") {
    footerText.textContent = completedWithWarnings ? ui.footerWarning : ui.footerOpening;
  } else {
    footerText.textContent = gateActive ? ui.gateFooter : ui.footerWaiting;
  }

  const stepCopy = copyByStep[activeLang][progress.id] ?? copyByStep[activeLang].folder;
  setupTitle.textContent = stepCopy.title;
  setupLead.textContent = stepCopy.lead;

  if (gateActive) {
    setupTitle.textContent = ui.gateTitle;
    setupLead.textContent = ui.gateLead;
  }
}

function updateStageView(activeStage, status = "running") {
  for (const stageNode of stages) {
    const key = stageNode.dataset.stage;
    stageNode.classList.toggle("active", key === activeStage && status === "running");
    stageNode.classList.toggle("done", completedStages.has(key));
    stageNode.classList.toggle("warning", key === activeStage && status === "warning");
  }
}

function setLanguage(nextLang) {
  activeLang = nextLang === "zh" ? "zh" : "en";
  document.documentElement.lang = activeLang === "zh" ? "zh-CN" : "en";
  for (const button of languageButtons) {
    button.classList.toggle("active", button.dataset.lang === activeLang);
  }
  renderLocalizedCopy(currentProgress);
  statusText.textContent = localizedStatusText(currentProgress);
  progressLabel.textContent = progressLabels[activeLang][currentProgress.id] ?? "SETUP";
}

function localizedStatusText(progress) {
  const raw = progress.warning || progress.message || progress.label;
  return localizedText(raw);
}

function addWarning(label, message) {
  const key = `${label}\u0000${message}`;
  if (warningKeys.has(key)) return;
  warningKeys.add(key);
  warningItems.push({ label, message });
  renderWarnings();
}

function renderWarnings() {
  warningList.replaceChildren();
  warningList.classList.toggle("hidden", warningItems.length === 0 || gateActive);
  for (const warning of warningItems) {
    const item = document.createElement("div");
    item.className = "warning-item";
    item.textContent = `${localizedText(warning.label)}: ${localizedText(warning.message)}`;
    warningList.appendChild(item);
  }
}

function localizedText(raw) {
  return activeLang === "zh" ? statusCopy.zh[raw] ?? raw : raw;
}

function setSetupControlsDisabled(disabled) {
  if (startSetupButton) startSetupButton.disabled = disabled;
  if (changeLocationButton) changeLocationButton.disabled = disabled;
}

async function startSetup(force = false) {
  if (started && !force) return;
  started = true;
  completedWithWarnings = false;
  document.body.classList.remove("setup-complete");
  document.body.classList.remove("setup-gate");
  setSetupControlsDisabled(true);
  retryButton.classList.add("hidden");
  doneActions?.classList.add("hidden");
  progressRow?.classList.remove("hidden");
  statusLine?.classList.remove("hidden");
  if (openFolderButton) openFolderButton.disabled = false;

  if (force) {
    warningItems.length = 0;
    warningKeys.clear();
    renderWarnings();
    completedStages.clear();
    if (initialPct >= 55) completedStages.add("install");
    renderProgress({ id: "folder", label: "Restarting setup...", pct: lastPct, status: "running" });
  }

  try {
    const result = force ? await desktop.repairSetup() : await desktop.startSetup();
    if (result?.warnings?.length) {
      completedWithWarnings = true;
      footerText.textContent = staticCopy[activeLang].footerWarning;
    }
  } catch (error) {
    started = false;
    setSetupControlsDisabled(false);
    renderProgress({
      id: "folder",
      label: "Setup failed.",
      pct: lastPct,
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function showLocationGate() {
  if (started) return;
  gateActive = true;
  completedStages.add("install");
  document.body.classList.add("setup-gate");
  document.body.classList.remove("setup-complete");
  progressRow?.classList.add("hidden");
  statusLine?.classList.add("hidden");
  warningList?.classList.add("hidden");
  doneActions?.classList.add("hidden");
  locationGate?.classList.remove("hidden");
  renderLocalizedCopy(currentProgress);
  updateStageView("choose", "running");
}

function hideLocationGate() {
  gateActive = false;
  document.body.classList.remove("setup-gate");
  locationGate?.classList.add("hidden");
  progressRow?.classList.remove("hidden");
  statusLine?.classList.remove("hidden");
  renderLocalizedCopy(currentProgress);
  updateStageView(stageMap[currentProgress.id] ?? "choose", currentProgress.status);
}

function setSyncFolder(folder) {
  currentSyncFolder = folder || currentSyncFolder;
  if (gatePath) gatePath.textContent = currentSyncFolder || "...";
  if (readyPath) readyPath.textContent = currentSyncFolder || "";
}

async function initSetupFlow() {
  setSyncFolder("...");
  showLocationGate();
  try {
    const folder = await desktop.getSyncFolder?.();
    if (folder) setSyncFolder(folder);
  } catch {
    // Keep the placeholder; setup can still continue with the default settings.
  }
}

function readInitialProgress() {
  const params = new URLSearchParams(window.location.search);
  const value = Number.parseFloat(params.get("initialProgress") ?? "0");
  return Number.isFinite(value) ? clamp(value, 0, 100) : 0;
}

function readInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lang") === "en" ? "en" : "zh";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

desktop.onSetupProgress(renderProgress);
desktop.onSetupLanguage?.((language) => setLanguage(language));
desktop.onSetupVisible?.(() => {
  if (!started) showLocationGate();
});
retryButton.addEventListener("click", () => startSetup(true));
whyButton.addEventListener("click", () => desktop.openWeb());
changeLocationButton?.addEventListener("click", async () => {
  if (started) return;
  setSetupControlsDisabled(true);
  try {
    const folder = await desktop.chooseSetupFolder?.();
    if (folder) setSyncFolder(folder);
  } catch {
    // Keep the current path on cancel/failure.
  } finally {
    setSetupControlsDisabled(false);
  }
});
startSetupButton?.addEventListener("click", () => {
  hideLocationGate();
  void startSetup();
});
openFolderButton?.addEventListener("click", () => {
  openFolderButton.disabled = true;
  void desktop.finishSetup?.();
});
for (const button of languageButtons) {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
}

setLanguage(initialLang);
void initSetupFlow();
renderProgress(currentProgress);
