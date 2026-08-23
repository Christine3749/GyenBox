"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { CanvasEditorContent } from "./core/components/CanvasEditorContent"
import {
  canvasStore,
  type CanvasDoc,
} from "./core/stores/canvasStore"
import { canvasPrefsStore, type CanvasPrefs } from "./core/stores/canvasPrefsStore"

const ACTIVE_DOC_KEY = "gyenbox_iwriter_active_doc"
const MIGRATION_MESSAGE = "gsyen:iwriter-migrate"

function newWritingDocument(): CanvasDoc {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: "无标题",
    content: "",
    type: "doc",
    scope: "self",
    createdAt: now,
    updatedAt: now,
    tags: ["iwriter"],
  }
}

function writingDocuments() {
  return canvasStore.getAll().filter(document => document.type === "doc")
}

function ensureWritingDocument() {
  const existing = writingDocuments()
  if (existing.length > 0) return existing[0]
  const document = newWritingDocument()
  canvasStore.add(document)
  return document
}

export function IWriterApp() {
  const [documents, setDocuments] = useState<CanvasDoc[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const requestedDocId = useMemo(
    () => new URLSearchParams(window.location.hash.slice(1)).get("doc"),
    [],
  )

  const refresh = useCallback(() => {
    setDocuments(writingDocuments())
  }, [])

  useEffect(() => {
    const starter = ensureWritingDocument()
    refresh()
    const remembered = localStorage.getItem(ACTIVE_DOC_KEY)
    setActiveDocId(
      (canvasStore.getById(requestedDocId ?? "")?.type === "doc" ? requestedDocId : null)
      ?? (canvasStore.getById(remembered ?? "")?.type === "doc" ? remembered : null)
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
      if (payload.activeDocId && documents.some(document => document.id === payload.activeDocId && document.type === "doc")) {
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

  const closeDocument = useCallback(() => {
    const next = writingDocuments().find(document => document.id !== activeDocId)
    if (next) {
      setActiveDocId(next.id)
      return
    }
    const blank = newWritingDocument()
    canvasStore.add(blank)
    setActiveDocId(blank.id)
  }, [activeDocId])

  if (activeDocument) {
    return <CanvasEditorContent docId={activeDocument.id} onClose={closeDocument} />
  }

  return <div className="fixed inset-0 bg-[#F8F8F8] dark:bg-[#171717]" aria-hidden />
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
