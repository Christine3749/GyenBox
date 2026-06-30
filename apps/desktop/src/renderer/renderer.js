const desktop = window.gyenboxDesktop;

const elements = {
  stateTitle: document.querySelector("#stateTitle"),
  stateDetail: document.querySelector("#stateDetail"),
  pauseButton: document.querySelector("#pauseButton"),
  queuedCount: document.querySelector("#queuedCount"),
  uploadedCount: document.querySelector("#uploadedCount"),
  failedCount: document.querySelector("#failedCount"),
  statusIcon: document.querySelector("#statusIcon"),
  statusText: document.querySelector("#statusText"),
  activityList: document.querySelector("#activityList"),
  activityListFull: document.querySelector("#activityListFull"),
  apiBaseUrlInput: document.querySelector("#apiBaseUrlInput"),
  accessTokenInput: document.querySelector("#accessTokenInput"),
  syncFolderInput: document.querySelector("#syncFolderInput"),
  searchInput: document.querySelector("#searchInput"),
  accountGlyph: document.querySelector("#accountGlyph"),
  accountPopover: document.querySelector("#accountPopover"),
  accountMenuGlyph: document.querySelector("#accountMenuGlyph"),
  accountMenuName: document.querySelector("#accountMenuName"),
  accountMenuEmail: document.querySelector("#accountMenuEmail"),
  accountStorageText: document.querySelector("#accountStorageText"),
  accountSignInButton: document.querySelector("#accountSignInButton"),
  accountSummary: document.querySelector("#accountSummary"),
  signInButton: document.querySelector("#signInButton"),
  signOutButton: document.querySelector("#signOutButton"),
  versionBadge: document.querySelector("#versionBadge"),
  currentFolderName: document.querySelector("#currentFolderName"),
  currentFolderPath: document.querySelector("#currentFolderPath"),
  homeFolderPath: document.querySelector("#homeFolderPath"),
  foldersFolderName: document.querySelector("#foldersFolderName"),
  foldersFolderPath: document.querySelector("#foldersFolderPath"),
  explorerDot: document.querySelector("#explorerDot"),
  explorerStatusText: document.querySelector("#explorerStatusText"),
  accountDot: document.querySelector("#accountDot"),
  accountStatusText: document.querySelector("#accountStatusText"),
  syncDot: document.querySelector("#syncDot"),
  syncStatusText: document.querySelector("#syncStatusText"),
  storageGyenboxBar: document.querySelector("#storageGyenboxBar"),
  storageOtherBar: document.querySelector("#storageOtherBar"),
  storageUsageText: document.querySelector("#storageUsageText"),
  syncIssueCount: document.querySelector("#syncIssueCount"),
  storageStatusPill: document.querySelector("#storageStatusPill"),
  selectiveSyncText: document.querySelector("#selectiveSyncText"),
  panel: document.querySelector(".panel"),
  authWelcome: document.querySelector("#authWelcome"),
  authWelcomeDetail: document.querySelector("#authWelcomeDetail"),
  authWelcomeWaiting: document.querySelector("#authWelcomeWaiting"),
};

let currentSnapshot = null;
let activeView = "home";

for (const button of document.querySelectorAll(".rail-button[data-view]")) {
  button.addEventListener("click", () => setView(button.dataset.view));
}

document
  .querySelector("#authWelcomeSignInButton")
  .addEventListener("click", openSignIn);
document
  .querySelector("#authWelcomeFolderButton")
  .addEventListener("click", () => desktop.openFolder());

document.querySelector("#pauseButton").addEventListener("click", () => {
  if (!currentSnapshot?.summary.accessTokenConfigured) {
    openSignIn();
    return;
  }
  desktop.togglePaused();
});
document
  .querySelector("#rescanButton")
  .addEventListener("click", () => desktop.rescan());
document
  .querySelector("#retryButton")
  .addEventListener("click", () => desktop.retryFailed());
document
  .querySelector("#repairButton")
  .addEventListener("click", async () => render(await desktop.repairExplorerStatus()));
document
  .querySelector("#repairHomeButton")
  .addEventListener("click", async () => render(await desktop.repairExplorerStatus()));
document
  .querySelector("#openFolderButton")
  .addEventListener("click", () => desktop.openFolder());
document
  .querySelector("#openFolderHeroButton")
  .addEventListener("click", () => desktop.openFolder());
document
  .querySelector("#openFolderMainButton")
  .addEventListener("click", () => desktop.openFolder());
document
  .querySelector("#changeFolderMainButton")
  .addEventListener("click", async () => render(await desktop.chooseFolder()));
document
  .querySelector("#openFolderFoldersButton")
  .addEventListener("click", () => desktop.openFolder());
document
  .querySelector("#changeFolderFoldersButton")
  .addEventListener("click", async () => render(await desktop.chooseFolder()));
document
  .querySelector("#repairFoldersButton")
  .addEventListener("click", async () => render(await desktop.repairExplorerStatus()));
document.querySelector("#webButton").addEventListener("click", async () => {
  closeAccountMenu();
  await openWeb();
});
document.querySelector("#accountButton").addEventListener("click", (event) => {
  event.stopPropagation();
  toggleAccountMenu();
});
elements.accountPopover.addEventListener("click", (event) => event.stopPropagation());
document.querySelector("#snoozeButton").addEventListener("click", () => {
  elements.statusIcon.textContent = "-";
  elements.statusText.textContent = "Notifications can be snoozed after notification rules ship.";
});
document.querySelector("#accountSignInButton").addEventListener("click", () => {
  closeAccountMenu();
  openSignIn();
});
document.querySelector("#preferencesButton").addEventListener("click", () => {
  closeAccountMenu();
  setView("settings");
});
document.querySelector("#syncStorageButton").addEventListener("click", () => {
  closeAccountMenu();
  setView("syncStorage");
});
document.querySelector("#helpButton").addEventListener("click", async () => {
  closeAccountMenu();
  await openWeb();
});
document.querySelector("#quitMenuButton").addEventListener("click", () => desktop.quit());
document
  .querySelector("#manageHardDriveButton")
  .addEventListener("click", () => desktop.openFolder());
document
  .querySelector("#selectiveSyncManageButton")
  .addEventListener("click", () => setView("folders"));
document
  .querySelector("#offlineManageButton")
  .addEventListener("click", () => desktop.openFolder());

document.querySelector("#addTeamButton").addEventListener("click", () => {
  elements.statusIcon.textContent = "+";
  elements.statusText.textContent = "Team accounts come next.";
});
document.addEventListener("click", closeAccountMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAccountMenu();
});
elements.signInButton.addEventListener("click", openSignIn);
elements.signOutButton.addEventListener("click", async () => {
  elements.statusIcon.textContent = "-";
  elements.statusText.textContent = "Signing out.";
  render(await desktop.signOut());
});
document
  .querySelector("#chooseFolderButton")
  .addEventListener("click", async () => render(await desktop.chooseFolder()));
document
  .querySelector("#saveSettingsButton")
  .addEventListener("click", async () => {
    const input = {
      apiBaseUrl: elements.apiBaseUrlInput.value.trim(),
      syncFolder: elements.syncFolderInput.value.trim(),
    };
    const fallbackToken = elements.accessTokenInput.value.trim();
    if (fallbackToken) {
      input.accessToken = fallbackToken;
      input.refreshToken = "";
      input.tokenExpiresAt = null;
      input.accountEmail = null;
    }
    render(await desktop.updateSettings(input));
    elements.accessTokenInput.value = "";
  });
elements.searchInput.addEventListener("input", () => renderActivity());

desktop.onSnapshot((snapshot) => render(snapshot));
desktop.getSnapshot().then(render);
desktop.getAppVersion?.().then((version) => {
  elements.versionBadge.textContent = `v${version}`;
});

function setView(view) {
  activeView = view;
  for (const button of document.querySelectorAll(".rail-button[data-view]")) {
    button.classList.toggle("active", button.dataset.view === view);
  }
  for (const panel of document.querySelectorAll(".view"))
    panel.classList.remove("active");
  document.querySelector(`#${view}View`).classList.add("active");
}

function toggleAccountMenu() {
  const willOpen = elements.accountPopover.hidden;
  elements.accountPopover.hidden = !willOpen;
  document.querySelector("#accountButton").classList.toggle("menu-open", willOpen);
}

function closeAccountMenu() {
  elements.accountPopover.hidden = true;
  document.querySelector("#accountButton").classList.remove("menu-open");
}

async function openWeb() {
  try {
    await desktop.openWeb?.();
    elements.statusIcon.textContent = "-";
    elements.statusText.textContent = "Opened GyenBox.com.";
  } catch (error) {
    elements.statusIcon.textContent = "!";
    elements.statusText.textContent = "Could not open GyenBox.com.";
    console.error("Failed to open GyenBox web", error);
  }
}
function render(snapshot) {
  if (!snapshot) return;
  currentSnapshot = snapshot;
  const { settings, summary } = snapshot;

  elements.apiBaseUrlInput.value = settings.apiBaseUrl;
  if (document.activeElement !== elements.accessTokenInput)
    elements.accessTokenInput.value = "";
  elements.syncFolderInput.value = settings.syncFolder;
  elements.currentFolderName.textContent = shortFolder(settings.syncFolder);
  elements.currentFolderPath.textContent = settings.syncFolder || "-";
  elements.homeFolderPath.textContent = settings.syncFolder || "C:\\Users\\You\\GyenBox";
  elements.foldersFolderName.textContent = shortFolder(settings.syncFolder);
  elements.foldersFolderPath.textContent = settings.syncFolder || "-";
  renderAuthWelcome(summary);
  renderHealth(summary);
  renderStorage(summary);
  elements.queuedCount.textContent = String(summary.queued);
  elements.uploadedCount.textContent = String(summary.uploaded);
  elements.failedCount.textContent = String(summary.failed);
  elements.pauseButton.textContent = actionLabel(summary);
  const accountInitials = summary.accessTokenConfigured
    ? initials(summary.accountEmail)
    : "!";
  elements.accountGlyph.textContent = accountInitials;
  elements.accountMenuGlyph.textContent = accountInitials;
  elements.accountMenuName.textContent = accountName(summary);
  elements.accountMenuEmail.textContent = accountEmailLine(summary);
  elements.accountStorageText.textContent = storageLabel(summary);
  elements.accountSignInButton.hidden = summary.accessTokenConfigured;
  elements.accountSummary.textContent = accountLabel(summary);
  elements.signInButton.textContent = summary.accessTokenConfigured
    ? "Reconnect GyenBox"
    : "Sign in with browser";
  elements.signOutButton.hidden = !summary.accessTokenConfigured;

  const state = stateCopy(summary);
  elements.stateTitle.textContent = state.title;
  elements.stateDetail.textContent = state.detail;
  elements.statusIcon.textContent = state.icon;
  elements.statusText.textContent = state.statusText ?? summary.lastMessage;

  renderActivity();
}

function renderAuthWelcome(summary) {
  const needsAuth = !summary.accessTokenConfigured;
  elements.panel.classList.toggle("auth-mode", needsAuth);
  elements.authWelcome.hidden = !needsAuth;
  if (!needsAuth) return;

  const folder = displayFolderPath(summary.syncFolder);
  elements.authWelcomeDetail.textContent =
    "Sign in to connect this device with your protected GyenBox space.";
  if (summary.queued > 0) {
    const noun = summary.queued === 1 ? "file" : "files";
    elements.authWelcomeWaiting.textContent = `${summary.queued} ${noun} waiting. Sign in and sync will continue automatically.`;
  } else {
    elements.authWelcomeWaiting.textContent = `Local folder: ${folder}`;
  }
}
function renderStorage(summary) {
  const gyenboxBytes = Number(summary.totalBytes || 0);
  const totalBytes = Number(summary.diskTotalBytes || 0);
  const usedBytes = Number(summary.diskUsedBytes || 0);
  const otherBytes = Math.max(0, usedBytes - gyenboxBytes);
  const gyenboxPercent = storagePercent(gyenboxBytes, totalBytes, gyenboxBytes > 0 ? 1 : 0);
  const otherPercent = Math.max(
    0,
    Math.min(100 - gyenboxPercent, storagePercent(otherBytes, totalBytes)),
  );

  elements.storageGyenboxBar.style.width = `${gyenboxPercent}%`;
  elements.storageOtherBar.style.width = `${otherPercent}%`;
  elements.storageUsageText.textContent = totalBytes > 0
    ? `${formatBytes(usedBytes)} of ${formatBytes(totalBytes)}`
    : `${formatBytes(gyenboxBytes)} in GyenBox`;

  elements.syncIssueCount.textContent = String(summary.failed || 0);
  elements.storageStatusPill.textContent = summary.failed > 0
    ? `${summary.failed} item${summary.failed === 1 ? "" : "s"} need attention`
    : summary.paused
      ? "Sync paused"
      : "All files are up to date";
  elements.selectiveSyncText.textContent = `${shortFolder(summary.syncFolder)} is visible on this device`;
}

function storagePercent(value, total, minimum = 0) {
  if (!total || value <= 0) return 0;
  return Math.max(minimum, Math.min(100, (value / total) * 100));
}
function renderActivity() {
  if (!currentSnapshot) return;
  const query = elements.searchInput.value.trim().toLowerCase();
  const files = (currentSnapshot.files ?? []).filter((file) => {
    if (!query) return true;
    return `${file.path} ${file.name} ${file.status}`.toLowerCase().includes(query);
  });
  const items = currentSnapshot.activity.filter((item) => {
    if (!query) return true;
    return `${item.path} ${item.message} ${item.type}`
      .toLowerCase()
      .includes(query);
  });

  renderFilesInto(elements.activityList, files);
  renderActivityInto(elements.activityListFull, items);
}

function renderFilesInto(container, files) {
  container.innerHTML = "";
  if (files.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = `Drop files into ${currentSnapshot?.summary.syncFolder ?? "GyenBox"}.`;
    container.append(empty);
    return;
  }

  for (const file of files) {
    const row = document.createElement("article");
    row.className = "activity-item file-item";
    row.dataset.type = file.status;

    const icon = document.createElement("div");
    icon.className = "activity-icon";
    icon.textContent = iconFor(file.status);

    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "activity-title";
    title.textContent = file.name || file.path || "GyenBox";

    const message = document.createElement("div");
    message.className = "activity-message";
    message.textContent = `${fileStatusLabel(file.status)} • ${formatBytes(file.size)}`;

    const path = document.createElement("div");
    path.className = "activity-time";
    path.textContent = file.path;

    body.append(title, message, path);
    row.append(icon, body);
    container.append(row);
  }
}
function renderActivityInto(container, items) {
  container.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent =
      "No sync activity yet. Add a file to the watched folder.";
    container.append(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "activity-item";
    row.dataset.type = item.type;

    const icon = document.createElement("div");
    icon.className = "activity-icon";
    icon.textContent = iconFor(item.type);

    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "activity-title";
    title.textContent = item.path || "GyenBox";

    const message = document.createElement("div");
    message.className = "activity-message";
    message.textContent = activityMessage(item);

    const time = document.createElement("div");
    time.className = "activity-time";
    time.textContent = formatTime(item.createdAt);

    body.append(title, message, time);
    row.append(icon, body);
    container.append(row);
  }
}

async function openSignIn() {
  setView("settings");
  elements.statusIcon.textContent = "-";
  elements.statusText.textContent = "Opening browser sign-in.";

  try {
    await desktop.openSignIn?.();
    elements.statusIcon.textContent = "-";
    elements.statusText.textContent = "Browser sign-in opened.";
  } catch (error) {
    elements.statusIcon.textContent = "!";
    elements.statusText.textContent = "Could not open sign-in.";
    console.error("Failed to open GyenBox sign-in", error);
  }
}

function actionLabel(summary) {
  if (!summary.accessTokenConfigured) return "Sign in";
  return summary.paused ? "Resume" : "Pause";
}

function accountLabel(summary) {
  if (!summary.accessTokenConfigured) return "Not signed in";
  return summary.accountEmail
    ? `Connected as ${summary.accountEmail}`
    : "Connected to GyenBox";
}

function accountName(summary) {
  if (!summary.accessTokenConfigured) return "GyenBox account";
  if (!summary.accountEmail) return "GyenBox";
  const name = summary.accountEmail.split("@")[0].replace(/[._-]+/g, " ").trim();
  return name || "GyenBox";
}

function accountEmailLine(summary) {
  if (!summary.accessTokenConfigured) return "Not signed in";
  return summary.accountEmail || "Connected to GyenBox";
}

function storageLabel(summary) {
  if (!summary.accessTokenConfigured) return "Sign in to sync your files.";
  return `${formatBytes(summary.totalBytes)} synced in this folder.`;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = value / 1024;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount >= 10 ? amount.toFixed(1) : amount.toFixed(2)} ${units[index]}`;
}
function initials(email) {
  if (!email) return "OK";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return letters.toUpperCase();
}

function renderHealth(summary) {
  setHealth(
    elements.explorerDot,
    elements.explorerStatusText,
    summary.failed > 0 ? "warn" : summary.syncing > 0 || summary.queued > 0 ? "work" : "ok",
    summary.failed > 0
      ? "Some items need repair."
      : summary.syncing > 0 || summary.queued > 0
        ? "Checks update after upload."
        : "Green checks are active.",
  );
  setHealth(
    elements.accountDot,
    elements.accountStatusText,
    summary.accessTokenConfigured ? "ok" : "warn",
    summary.accessTokenConfigured ? accountLabel(summary) : "Sign in required.",
  );
  setHealth(
    elements.syncDot,
    elements.syncStatusText,
    summary.failed > 0 ? "bad" : summary.paused ? "warn" : summary.syncing > 0 || summary.queued > 0 ? "work" : "ok",
    summary.failed > 0
      ? `${summary.failed} issue${summary.failed === 1 ? "" : "s"}.`
      : summary.paused
        ? "Paused."
        : summary.syncing > 0 || summary.queued > 0
          ? `${summary.queued} waiting, ${summary.syncing} active.`
          : `${summary.uploaded} synced.`,
  );
}

function setHealth(dot, text, tone, message) {
  dot.dataset.tone = tone;
  dot.textContent = tone === "ok" ? "✓" : tone === "work" ? "~" : "!";
  text.textContent = message;
}

function fileStatusLabel(status) {
  const labels = {
    queued: "Waiting",
    syncing: "Syncing",
    uploaded: "Synced",
    failed: "Needs attention",
    skipped: "Skipped",
  };
  return labels[status] ?? "File";
}

function activityMessage(item) {
  if (
    !currentSnapshot?.summary.accessTokenConfigured &&
    item.type === "queued"
  ) {
    return "Queued until sign-in.";
  }
  return item.message;
}

function stateCopy(summary) {
  const folder = displayFolderPath(summary.syncFolder);
  if (summary.paused) {
    return {
      title: "Sync paused",
      detail: `Watching ${folder}. Uploads are paused.`,
      icon: "||",
      statusText: "Sync paused",
    };
  }
  if (!summary.accessTokenConfigured) {
    if (summary.queued > 0) {
      const noun = summary.queued === 1 ? "file" : "files";
      return {
        title: "Sign in required",
        detail: `${summary.queued} ${noun} waiting for sign-in.`,
        icon: "!",
        statusText: "Waiting for sign-in",
      };
    }
    return {
      title: "Sign in required",
      detail: `Watching ${folder}. Sign in to upload.`,
      icon: "!",
      statusText: "Waiting for sign-in",
    };
  }
  if (summary.failed > 0) {
    return {
      title: "Needs attention",
      detail: `${summary.failed} item${summary.failed === 1 ? "" : "s"} failed to sync.`,
      icon: "!",
      statusText: "Some files need attention",
    };
  }
  if (summary.syncing > 0 || summary.queued > 0) {
    return {
      title: "Syncing",
      detail: `${summary.queued} queued, ${summary.syncing} active.`,
      icon: "~",
      statusText: "Syncing files",
    };
  }
  return {
    title: "Up to date",
    detail: `Watching ${folder}.`,
    icon: "✓",
    statusText: "Your files are up to date",
  };
}

function displayFolderPath(path) {
  return path || "No folder selected";
}
function shortFolder(path) {
  if (!path) return "GyenBox";
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || path;
}

function iconFor(type) {
  const icons = {
    info: "i",
    queued: "+",
    syncing: "~",
    uploaded: "✓",
    failed: "!",
    deleted: "-",
    skipped: "s",
  };
  return icons[type] ?? "i";
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
