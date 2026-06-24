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
  elements.statusText.textContent = summary.lastMessage

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
    empty.textContent = "No sync activity yet. Add a file to your GyenBox folder."
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
  if (summary.paused) {
    return { title: "Sync paused", detail: "GyenBox is watching, but uploads are paused.", icon: "||" }
  }
  if (!summary.accessTokenConfigured) {
    return { title: "Connect account", detail: "Paste a Supabase access token to start uploading.", icon: "!" }
  }
  if (summary.failed > 0) {
    return { title: "Needs attention", detail: `${summary.failed} item${summary.failed === 1 ? "" : "s"} failed to sync.`, icon: "!" }
  }
  if (summary.syncing > 0 || summary.queued > 0) {
    return { title: "Syncing files", detail: `${summary.queued} queued, ${summary.syncing} active.`, icon: "~" }
  }
  return { title: "Up to date", detail: "Your files are up to date.", icon: "✓" }
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
