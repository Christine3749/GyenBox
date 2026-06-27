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
  accountSummary: document.querySelector("#accountSummary"),
  signInButton: document.querySelector("#signInButton"),
  signOutButton: document.querySelector("#signOutButton"),
  versionBadge: document.querySelector("#versionBadge"),
};

let currentSnapshot = null;
let activeView = "home";

for (const button of document.querySelectorAll(".rail-button[data-view]")) {
  button.addEventListener("click", () => setView(button.dataset.view));
}

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
  .querySelector("#openFolderButton")
  .addEventListener("click", () => desktop.openFolder());
document
  .querySelector("#openFolderHeroButton")
  .addEventListener("click", () => desktop.openFolder());
document.querySelector("#accountButton").addEventListener("click", () => {
  setView("settings");
  if (!currentSnapshot?.summary.accessTokenConfigured) openSignIn();
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

function render(snapshot) {
  if (!snapshot) return;
  currentSnapshot = snapshot;
  const { settings, summary } = snapshot;

  elements.apiBaseUrlInput.value = settings.apiBaseUrl;
  if (document.activeElement !== elements.accessTokenInput)
    elements.accessTokenInput.value = "";
  elements.syncFolderInput.value = settings.syncFolder;
  elements.queuedCount.textContent = String(summary.queued);
  elements.uploadedCount.textContent = String(summary.uploaded);
  elements.failedCount.textContent = String(summary.failed);
  elements.pauseButton.textContent = actionLabel(summary);
  elements.accountGlyph.textContent = summary.accessTokenConfigured
    ? initials(summary.accountEmail)
    : "!";
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

function renderActivity() {
  if (!currentSnapshot) return;
  const query = elements.searchInput.value.trim().toLowerCase();
  const items = currentSnapshot.activity.filter((item) => {
    if (!query) return true;
    return `${item.path} ${item.message} ${item.type}`
      .toLowerCase()
      .includes(query);
  });

  renderActivityInto(elements.activityList, items.slice(0, 8));
  renderActivityInto(elements.activityListFull, items);
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

function initials(email) {
  if (!email) return "OK";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return letters.toUpperCase();
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
  const folder = shortFolder(summary.syncFolder);
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
