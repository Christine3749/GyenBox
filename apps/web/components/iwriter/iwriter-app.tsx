"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { CanvasEditorContent } from "./core/components/CanvasEditorContent"
import {
  canvasStore,
  type CanvasDoc,
  type CanvasType,
} from "./core/stores/canvasStore"
import { canvasPrefsStore, type CanvasPrefs } from "./core/stores/canvasPrefsStore"

const ACTIVE_DOC_KEY = "gyenbox_iwriter_active_doc"
const MIGRATION_MESSAGE = "gsyen:iwriter-migrate"

const STARTER_CONTENT = `# 欢迎使用 iWriter

iWriter by GyenBox 是你的本地优先写作空间。

- 使用左上角按钮打开资料库
- 在 **View** 中切换写作、预览和分栏
- 在 **Focus** 中选择句子或段落聚焦
- 使用 **Typewriter Mode** 保持当前行居中
- 新建白板或节点图，把写作与思考放在同一个工作台
`

function newDocument(type: CanvasType, title?: string): CanvasDoc {
  const now = new Date().toISOString()
  const content = type === "canvas"
    ? JSON.stringify({ elements: [], appState: { viewBackgroundColor: "transparent" } })
    : type === "nodes"
      ? JSON.stringify({ nodes: [], edges: [] })
      : ""

  return {
    id: crypto.randomUUID(),
    title: title ?? (type === "canvas" ? "新白板" : type === "nodes" ? "新节点图" : "无标题"),
    content,
    type,
    scope: "self",
    createdAt: now,
    updatedAt: now,
    tags: ["iwriter"],
  }
}

function ensureStarterDocument() {
  const existing = canvasStore.getAll()
  if (existing.length > 0) return existing[0]

  const now = new Date().toISOString()
  const starter: CanvasDoc = {
    id: crypto.randomUUID(),
    title: "欢迎使用 iWriter",
    content: STARTER_CONTENT,
    type: "doc",
    scope: "self",
    createdAt: now,
    updatedAt: now,
    tags: ["iwriter", "welcome"],
  }
  canvasStore.add(starter)
  return starter
}

export function IWriterApp() {
  const [documents, setDocuments] = useState<CanvasDoc[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const requestedDocId = useMemo(
    () => new URLSearchParams(window.location.hash.slice(1)).get("doc"),
    [],
  )

  const refresh = useCallback(() => {
    setDocuments(canvasStore.getAll())
  }, [])

  useEffect(() => {
    const starter = ensureStarterDocument()
    refresh()
    const remembered = localStorage.getItem(ACTIVE_DOC_KEY)
    setActiveDocId(
      canvasStore.getById(requestedDocId ?? "")?.id
      ?? canvasStore.getById(remembered ?? "")?.id
      ?? starter.id,
    )

    window.addEventListener("canvas-updated", refresh)
    return () => window.removeEventListener("canvas-updated", refresh)
  }, [refresh, requestedDocId])

  useEffect(() => {
    if (requestedDocId && documents.some(document => document.id === requestedDocId)) {
      setActiveDocId(requestedDocId)
    }
  }, [documents, requestedDocId])

  useEffect(() => {
    const migrationToken = new URLSearchParams(window.location.hash.slice(1)).get("migrate")
    if (!migrationToken) return

    const receiveMigration = (event: MessageEvent) => {
      const payload = event.data as {
        type?: string
        token?: string
        documents?: CanvasDoc[]
        activeDocId?: string | null
        localState?: {
          preferences?: Partial<CanvasPrefs> | null
          librarySort?: unknown
          chatSessions?: unknown
          currentChat?: unknown
          currentSessionId?: string | null
          lastClosedModel?: string | null
        }
      }
      if (
        event.source !== window.opener
        || payload?.type !== MIGRATION_MESSAGE
        || payload.token !== migrationToken
        || !Array.isArray(payload.documents)
      ) return

      const documents = payload.documents.filter(isCanvasDocument)
      canvasStore.importDocuments(documents)
      importLocalState(payload.localState)
      refresh()
      if (payload.activeDocId && documents.some(document => document.id === payload.activeDocId)) {
        setActiveDocId(payload.activeDocId)
      }
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
      ;(event.source as WindowProxy).postMessage(
        { type: "gyenbox:iwriter-migrated", token: migrationToken },
        event.origin,
      )
    }

    window.addEventListener("message", receiveMigration)
    return () => window.removeEventListener("message", receiveMigration)
  }, [refresh])

  useEffect(() => {
    if (activeDocId) localStorage.setItem(ACTIVE_DOC_KEY, activeDocId)
    else localStorage.removeItem(ACTIVE_DOC_KEY)
  }, [activeDocId])

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocId) ?? null,
    [activeDocId, documents],
  )

  const create = useCallback((type: CanvasType) => {
    const document = newDocument(type)
    canvasStore.add(document)
    setActiveDocId(document.id)
  }, [])

  if (activeDocument) {
    return <CanvasEditorContent docId={activeDocument.id} onClose={() => setActiveDocId(null)} />
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-8 py-10 text-[#1A1A1A]">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-black/10 pb-7">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-black/40">GYENBOX / LOCAL-FIRST</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">iWriter</h1>
            <p className="mt-2 text-sm text-black/50">写作、白板、节点图与本地资料，在一个安静的工作台里。</p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="新建内容">
            <CreateButton onClick={() => create("doc")}>新建文档</CreateButton>
            <CreateButton onClick={() => create("canvas")}>新建白板</CreateButton>
            <CreateButton onClick={() => create("nodes")}>新建节点图</CreateButton>
          </nav>
        </header>

        <section className="mt-10" aria-labelledby="recent-documents">
          <div className="flex items-center justify-between">
            <h2 id="recent-documents" className="text-sm font-semibold">最近文档</h2>
            <span className="font-mono text-xs text-black/35">{documents.length} ITEMS</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => setActiveDocId(document.id)}
                className="min-h-36 rounded-md border border-black/10 bg-white p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.035)] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/35">{document.type}</span>
                <strong className="mt-3 block truncate text-lg font-semibold">{document.title || "无标题"}</strong>
                <span className="mt-8 block text-xs text-black/40">
                  {new Date(document.updatedAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function importLocalState(state: {
  preferences?: Partial<CanvasPrefs> | null
  librarySort?: unknown
  chatSessions?: unknown
  currentChat?: unknown
  currentSessionId?: string | null
  lastClosedModel?: string | null
} | undefined) {
  if (!state) return
  if (state.preferences && typeof state.preferences === "object") {
    const { lastFilePath: _localPath, ...portablePreferences } = state.preferences
    canvasPrefsStore.set(portablePreferences)
  }
  writeJsonStorage("gyenbox_iwriter_library_sort", state.librarySort)
  writeJsonStorage("gsyen_sessions_cache", state.chatSessions)
  writeJsonStorage("gsyen_current_chat", state.currentChat)
  if (state.currentSessionId) localStorage.setItem("gsyen_current_session_id", state.currentSessionId)
  if (state.lastClosedModel) localStorage.setItem("gsyen-last-closed-model", state.lastClosedModel)
}

function writeJsonStorage(key: string, value: unknown) {
  if (value == null) return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function isCanvasDocument(value: unknown): value is CanvasDoc {
  if (!value || typeof value !== "object") return false
  const document = value as Partial<CanvasDoc>
  return typeof document.id === "string"
    && typeof document.title === "string"
    && typeof document.content === "string"
    && ["doc", "canvas", "nodes", "image", "office"].includes(document.type ?? "")
    && ["self", "shared"].includes(document.scope ?? "")
    && typeof document.createdAt === "string"
    && typeof document.updatedAt === "string"
}

function CreateButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-black/15 bg-white px-4 py-2 text-sm font-medium transition hover:border-black/30 hover:bg-black hover:text-white"
    >
      {children}
    </button>
  )
}
