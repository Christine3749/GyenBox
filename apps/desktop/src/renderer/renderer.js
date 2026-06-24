const desktop = window.gyenboxDesktop

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
}

let currentSnapshot = null
let activeView = "home"

for (const button of document.querySelectorAll(".rail-button[data-view]")) {
  button.addEventListener("click", () => setView(button.dataset.view))
}

document.querySelector("#quitButton").addEventListener("click", () => desktop.quit())
document.querySelector("#pauseButton").addEventListener("click", () => desktop.togglePaused())
document.querySelector("#rescanButton").addEventListener("click", () => desktop.rescan())
document.querySelector("#retryButton").addEventListener("click", () => desktop.retryFailed())
document.querySelector("#openFolderButton").addEventListener("click", () => desktop.openFolder())
document.querySelector("#openFolderHeroButton").addEventListener("click", () => desktop.openFolder())
document.querySelector("#chooseFolderButton").addEventListener("click", async () => render(await desktop.chooseFolder()))
document.querySelector("#saveSettingsButton").addEventListener("click", async () => {
  render(await desktop.updateSettings({
    apiBaseUrl: elements.apiBaseUrlInput.value.trim(),
    accessToken: elements.accessTokenInput.value.trim(),
    syncFolder: elements.syncFolderInput.value.trim(),
  }))
})
elements.searchInput.addEventListener("input", () => renderActivity())

desktop.onSnapshot((snapshot) => render(snapshot))
desktop.getSnapshot().then(render)

function setView(view) {
  activeView = view
  for (const button of document.querySelectorAll(".rail-button[data-view]")) {
    button.classList.toggle("active", button.dataset.view === view)
  }
  for (const panel of document.querySelectorAll(".view")) panel.classList.remove("active")
  document.querySelector(`#${view}View`).classList.add("active")
}

function render(snapshot) {
  if (!snapshot) return
  currentSnapshot = snapshot
  const { settings, summary } = snapshot

  elements.apiBaseUrlInput.value = settings.apiBaseUrl
  elements.accessTokenInput.value = settings.accessToken
  elements.syncFolderInput.value = settings.syncFolder
  elements.queuedCount.textContent = String(summary.queued)
  elements.uploadedCount.textContent = String(summary.uploaded)
  elements.failedCount.textContent = String(summary.failed)
  elements.pauseButton.textContent = summary.paused ? "Resume" : "Pause"

  const state = stateCopy(summary)
  elements.stateTitle.textContent = state.title
  elements.stateDetail.textContent = state.detail
  elements.statusIcon.textContent = state.icon
  elements.statusText.textContent = state.statusText ?? summary.lastMessage

  renderActivity()
}

function renderActivity() {
  if (!currentSnapshot) return
  const query = elements.searchInput.value.trim().toLowerCase()
  const items = currentSnapshot.activity.filter((item) => {
    if (!query) return true
    return `${item.path} ${item.message} ${item.type}`.toLowerCase().includes(query)
  })

  renderActivityInto(elements.activityList, items.slice(0, 8))
  renderActivityInto(elements.activityListFull, items)
}

function renderActivityInto(container, items) {
  container.innerHTML = ""
  if (items.length === 0) {
    const empty = document.createElement("div")
    empty.className = "empty"
    empty.textContent = "No sync activity yet. Add a file to the watched folder."
    container.append(empty)
    return
  }

  for (const item of items) {
    const row = document.createElement("article")
    row.className = "activity-item"
    row.dataset.type = item.type

    const icon = document.createElement("div")
    icon.className = "activity-icon"
    icon.textContent = iconFor(item.type)

    const body = document.createElement("div")
    const title = document.createElement("div")
    title.className = "activity-title"
    title.textContent = item.path || "GyenBox"

    const message = document.createElement("div")
    message.className = "activity-message"
    message.textContent = item.message

    const time = document.createElement("div")
    time.className = "activity-time"
    time.textContent = formatTime(item.createdAt)

    body.append(title, message, time)
    row.append(icon, body)
    container.append(row)
  }
}

function stateCopy(summary) {
  const folder = shortFolder(summary.syncFolder)
  if (summary.paused) {
    return { title: "Sync paused", detail: `Watching ${folder}. Uploads are paused.`, icon: "||", statusText: "Sync paused" }
  }
  if (!summary.accessTokenConfigured) {
    return { title: "Sign in to sync", detail: `Watching ${folder}. Add an access token to upload.`, icon: "i", statusText: `Watching ${folder}` }
  }
  if (summary.failed > 0) {
    return { title: "Needs attention", detail: `${summary.failed} item${summary.failed === 1 ? "" : "s"} failed to sync.`, icon: "!", statusText: "Some files need attention" }
  }
  if (summary.syncing > 0 || summary.queued > 0) {
    return { title: "Syncing", detail: `${summary.queued} queued, ${summary.syncing} active.`, icon: "~", statusText: "Syncing files" }
  }
  return { title: "Up to date", detail: `Watching ${folder}.`, icon: "✓", statusText: "Your files are up to date" }
}

function shortFolder(path) {
  if (!path) return "GyenBox"
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) || path
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
  }
  return icons[type] ?? "i"
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "just now"
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}


