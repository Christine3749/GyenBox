'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  Bell,
  Check,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Folder,
  HardDrive,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  List,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react'

import { GyenBoxLogo } from '@/components/brand/gyenbox-logo'
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '@/lib/supabase-client'
import { INITIAL_ACTIVITIES, INITIAL_COMMENTS } from './initialData'
import type { ActivityItem, CommentItem, FileItem, FileType } from './types'

type NavId = 'home' | 'files' | 'shared' | 'starred' | 'recent' | 'trash'
type ViewMode = 'grid' | 'list'
type AuthStatus = 'loading' | 'ready' | 'unauthenticated' | 'unconfigured'
type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { message?: string } }
type TypeConfig = { icon: LucideIcon; label: string; color: string; surface: string }

const typeConfig: Record<FileType, TypeConfig> = {
  folder: { icon: Folder, label: 'Folder', color: '#5F74C4', surface: '#E7EAF5' },
  png: { icon: ImageIcon, label: 'PNG', color: '#4F87A6', surface: '#E4F0F5' },
  jpg: { icon: ImageIcon, label: 'JPG', color: '#4F87A6', surface: '#E4F0F5' },
  pdf: { icon: FileText, label: 'PDF', color: '#B56B77', surface: '#F4E4E7' },
  docx: { icon: FileText, label: 'DOC', color: '#5F74C4', surface: '#E7EAF5' },
  xlsx: { icon: FileSpreadsheet, label: 'XLS', color: '#6F8F78', surface: '#E5EDE6' },
  mp4: { icon: Video, label: 'MP4', color: '#7566A8', surface: '#EBE6F4' },
  zip: { icon: Archive, label: 'ZIP', color: '#7C7A73', surface: '#ECE9E3' },
  txt: { icon: FileText, label: 'TXT', color: '#5F74C4', surface: '#E7EAF5' },
}

const navItems: Array<{ id: NavId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'files', label: 'My Files', icon: Folder },
  { id: 'shared', label: 'Shared', icon: Users },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'recent', label: 'Recent', icon: Clock3 },
  { id: 'trash', label: 'Trash', icon: Trash2 },
]

function formatStorage(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function titleForTab(tab: NavId, currentFolder: FileItem | null) {
  if (currentFolder) return currentFolder.name
  if (tab === 'home') return 'Territory'
  if (tab === 'files') return 'My Files'
  if (tab === 'shared') return 'Shared'
  if (tab === 'starred') return 'Starred'
  if (tab === 'recent') return 'Recent'
  return 'Trash'
}

async function readApi<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(payload?.error?.message ?? 'Request failed')
  }
  return payload.data
}

export default function GyenboxWorkspace() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [files, setFiles] = useState<FileItem[]>([])
  const [storageUsedBytes, setStorageUsedBytes] = useState(0)
  const [storageQuotaBytes, setStorageQuotaBytes] = useState(10 * 1024 * 1024 * 1024)
  const [activeTab, setActiveTab] = useState<NavId>('home')
  const [currentFolder, setCurrentFolder] = useState<FileItem | null>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shareFile, setShareFile] = useState<FileItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES)
  const [comments] = useState<Record<string, CommentItem[]>>(INITIAL_COMMENTS)

  const authHeaders = useCallback(() => {
    return session ? { Authorization: `Bearer ${session.access_token}` } : undefined
  }, [session])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  const loadFiles = useCallback(
    async (folderId: string | null) => {
      if (!session) return
      setIsLoadingFiles(true)
      try {
        const params = new URLSearchParams()
        if (folderId) params.set('folderId', folderId)
        const data = await readApi<{ files: FileItem[]; storageUsedBytes: number; storageQuotaBytes: number }>(
          await fetch(`/api/files?${params.toString()}`, { headers: authHeaders() }),
        )
        setFiles(data.files)
        setStorageUsedBytes(data.storageUsedBytes)
        setStorageQuotaBytes(data.storageQuotaBytes)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not load files')
      } finally {
        setIsLoadingFiles(false)
      }
    },
    [authHeaders, session],
  )

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) {
      setAuthStatus('unconfigured')
      return
    }

    const supabase = getSupabaseBrowserClient()
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthStatus(data.session ? 'ready' : 'unauthenticated')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthStatus(nextSession ? 'ready' : 'unauthenticated')
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.replace('/login')
  }, [authStatus, router])

  useEffect(() => {
    if (session) void loadFiles(currentFolder?.id ?? null)
  }, [currentFolder?.id, loadFiles, session])

  const visibleFiles = useMemo(() => {
    let result = files
    if (activeTab === 'trash') result = result.filter((file) => file.isTrash)
    else {
      result = result.filter((file) => !file.isTrash)
      if (activeTab === 'shared') result = result.filter((file) => file.shared)
      if (activeTab === 'starred') result = result.filter((file) => file.starred)
      if (activeTab === 'recent') result = result.filter((file) => file.type !== 'folder')
    }

    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery) result = result.filter((file) => file.name.toLowerCase().includes(normalizedQuery))

    return [...result].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })
  }, [activeTab, files, query])

  const selectedFile = useMemo(() => files.find((file) => file.id === selectedId) ?? null, [files, selectedId])
  const storagePercent = storageQuotaBytes > 0 ? Math.min(100, (storageUsedBytes / storageQuotaBytes) * 100) : 0
  const accountLabel = session?.user.email?.slice(0, 2).toUpperCase() ?? 'GB'

  function navigateToFolder(folder: FileItem | null) {
    setCurrentFolder(folder)
    setActiveTab('files')
    setSelectedId(null)
  }

  async function patchItem(file: FileItem, patch: Record<string, unknown>, success: string) {
    try {
      const data = await readApi<{ file: FileItem }>(
        await fetch(`/api/files/${file.id}`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }),
      )
      setFiles((previous) => previous.map((item) => (item.id === file.id ? data.file : item)))
      notify(success)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update file')
    }
  }

  async function createFolder() {
    const name = window.prompt('Folder name')?.trim()
    if (!name) return

    try {
      const data = await readApi<{ file: FileItem }>(
        await fetch('/api/folders', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, parentId: currentFolder?.id }),
        }),
      )
      setFiles((previous) => [data.file, ...previous])
      notify('Folder created')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not create folder')
    }
  }

  function handleOpen(file: FileItem) {
    if (file.type === 'folder') {
      navigateToFolder(file)
      return
    }
    void downloadFile(file)
  }

  async function downloadFile(file: FileItem) {
    if (file.type === 'folder') return
    try {
      const response = await fetch(`/api/download/${file.id}`, { headers: authHeaders() })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null
        throw new Error(payload?.error?.message ?? 'Download failed')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      notify(error instanceof Error ? error.message : `Preparing ${file.name}`)
    }
  }

  async function handleUploadSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length) return

    setIsUploading(true)
    try {
      for (const file of selected) {
        const formData = new FormData()
        formData.append('file', file)
        if (currentFolder?.id) formData.append('folderId', currentFolder.id)

        const data = await readApi<{ file: FileItem }>(
          await fetch('/api/upload', { method: 'POST', headers: authHeaders(), body: formData }),
        )
        setFiles((previous) => [data.file, ...previous])
      }
      notify(selected.length === 1 ? 'File uploaded' : `${selected.length} files uploaded`)
      void loadFiles(currentFolder?.id ?? null)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  async function signOut() {
    if (hasSupabaseBrowserConfig()) await getSupabaseBrowserClient().auth.signOut()
    router.push('/login')
  }

  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return <StatusScreen title="Opening GyenBox" detail="Checking your secure session." />
  }

  if (authStatus === 'unconfigured') {
    return <StatusScreen title="Supabase key missing" detail="Set NEXT_PUBLIC_SUPABASE_ANON_KEY first." />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--gb-paper)] text-[var(--gb-ink)]">
      <input ref={fileInputRef} className="hidden" type="file" multiple onChange={handleUploadSelection} />

      <aside className="flex w-[230px] shrink-0 flex-col border-r border-[var(--gb-line)] bg-[var(--gb-paper-muted)]">
        <div className="gb-titlebar flex h-9 items-center px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--gb-line-strong)] bg-[#E9B4AC]" />
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--gb-line-strong)] bg-[#E8D28F]" />
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--gb-line-strong)] bg-[#A9C6AA]" />
          </div>
        </div>

        <button
          className="mx-3 mt-4 flex items-center gap-3 border border-transparent px-2 py-2 text-left hover:border-[var(--gb-line)] hover:bg-[var(--gb-paper-raised)]"
          onClick={() => {
            setActiveTab('home')
            navigateToFolder(null)
          }}
        >
          <GyenBoxLogo showSubtitle markClassName="h-10 w-10" />
        </button>

        <nav className="mt-5 space-y-0.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id && !currentFolder
            return (
              <button
                key={item.id}
                className={`grid h-9 w-full grid-cols-[18px_1fr] items-center gap-2 border px-2 text-left text-[13px] transition ${
                  active
                    ? 'border-[#8896C6]/50 bg-[#E7EAF5] font-bold text-[var(--gb-ink)]'
                    : 'border-transparent text-[var(--gb-muted)] hover:border-[var(--gb-line)] hover:bg-[var(--gb-paper-raised)] hover:text-[var(--gb-ink)]'
                }`}
                onClick={() => {
                  setActiveTab(item.id)
                  setCurrentFolder(null)
                  setSelectedId(null)
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mx-3 mt-6 border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--gb-muted)]">
            <span>Storage</span>
            <span className="gb-mono">{formatStorage(storageUsedBytes)}</span>
          </div>
          <div className="h-1.5 bg-[rgba(26,26,26,0.08)]">
            <div className="h-full bg-[#8896C6]" style={{ width: `${storagePercent}%` }} />
          </div>
          <p className="mt-2 gb-mono text-[10px] text-[var(--gb-faint)]">{files.length} ITEMS / {formatStorage(storageQuotaBytes)}</p>
        </div>

        <div className="mx-3 mt-auto mb-3 border border-[var(--gb-line)] bg-[#E7EAF5] p-3 text-[12px] leading-5 text-[#4E63AF]">
          <div className="mb-1 flex items-center gap-2 font-bold text-[var(--gb-ink)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Live storage
          </div>
          <p>Supabase identity and Google objects are connected.</p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="gb-titlebar flex h-9 shrink-0 items-center justify-between px-4">
          <span className="gb-mono text-[10px] tracking-[0.18em] text-[var(--gb-muted)]">GYENBOX - {titleForTab(activeTab, currentFolder).toUpperCase()}</span>
          <div className="flex items-center gap-2 text-[11px] text-[var(--gb-muted)]">
            <Bell className="h-3.5 w-3.5" />
            <button className="inline-flex items-center gap-1 hover:text-[var(--gb-ink)]" onClick={signOut}>
              {accountLabel}
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--gb-line)] bg-[var(--gb-paper-raised)] px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-[var(--gb-muted)]">
              <button className="hover:text-[var(--gb-ink)]" onClick={() => navigateToFolder(null)}>GyenBox</button>
              {currentFolder ? (
                <>
                  <span>/</span>
                  <button className="hover:text-[var(--gb-ink)]" onClick={() => navigateToFolder(null)}>My Files</button>
                  <span>/</span>
                  <span className="truncate text-[var(--gb-ink)]">{currentFolder.name}</span>
                </>
              ) : null}
            </div>
            <h1 className="truncate text-[18px] font-bold leading-tight text-[var(--gb-ink-deep)]">{titleForTab(activeTab, currentFolder)}</h1>
          </div>

          <div className="relative w-[320px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gb-faint)]" />
            <input
              className="h-9 w-full border border-[var(--gb-line)] bg-[var(--gb-paper)] pl-8 pr-3 text-[13px] outline-none placeholder:text-[var(--gb-faint)] focus:border-[#8896C6]"
              placeholder="Search files"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <button
            className="inline-flex h-9 items-center gap-2 bg-[var(--gb-ink)] px-3 text-[13px] font-bold text-[var(--gb-paper)] hover:bg-[#2A2A2A] disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading' : 'Upload'}
          </button>
        </div>

        <section className="grid shrink-0 grid-cols-3 border-b border-[var(--gb-line)] bg-[var(--gb-paper)]">
          <Metric icon={HardDrive} label="Storage" value={formatStorage(storageUsedBytes)} />
          <Metric icon={Share2} label="Shared" value={String(files.filter((file) => file.shared && !file.isTrash).length)} />
          <Metric icon={Clock3} label="Recent" value={String(files.filter((file) => file.type !== 'folder').length)} />
        </section>

        <section className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col gb-paper-grid">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--gb-line)] bg-[rgba(249,248,246,0.82)] px-5">
              <button className="inline-flex h-8 items-center gap-2 border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] px-2.5 text-[12px] font-bold hover:bg-[var(--gb-paper-muted)]" onClick={createFolder}>
                <Folder className="h-3.5 w-3.5" />
                New folder
              </button>
              <button className={`ml-auto flex h-8 w-8 items-center justify-center border border-[var(--gb-line)] ${viewMode === 'grid' ? 'bg-[#E7EAF5] text-[#5F74C4]' : 'bg-[var(--gb-paper-raised)] text-[var(--gb-muted)]'}`} onClick={() => setViewMode('grid')} title="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button className={`flex h-8 w-8 items-center justify-center border border-[var(--gb-line)] ${viewMode === 'list' ? 'bg-[#E7EAF5] text-[#5F74C4]' : 'bg-[var(--gb-paper-raised)] text-[var(--gb-muted)]'}`} onClick={() => setViewMode('list')} title="List view">
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 gb-scrollbar">
              {isLoadingFiles ? (
                <EmptyState text="Loading files..." />
              ) : visibleFiles.length === 0 ? (
                <EmptyState text="No files in this view." />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-3">
                  {visibleFiles.map((file) => (
                    <FileTile
                      key={file.id}
                      file={file}
                      selected={file.id === selectedId}
                      onOpen={handleOpen}
                      onSelect={() => setSelectedId(file.id)}
                      onShare={() => setShareFile(file)}
                      onStar={() => void patchItem(file, { isStarred: !file.starred }, file.starred ? 'Removed from starred' : 'Added to starred')}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-[var(--gb-line)] bg-[var(--gb-paper-raised)]">
                  {visibleFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      selected={file.id === selectedId}
                      onOpen={handleOpen}
                      onSelect={() => setSelectedId(file.id)}
                      onShare={() => setShareFile(file)}
                      onStar={() => void patchItem(file, { isStarred: !file.starred }, file.starred ? 'Removed from starred' : 'Added to starred')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedFile ? (
            <DetailsPanel
              file={selectedFile}
              comments={comments[selectedFile.id] ?? []}
              activities={activities}
              onClose={() => setSelectedId(null)}
              onShare={() => setShareFile(selectedFile)}
              onDownload={() => void downloadFile(selectedFile)}
              onTrash={() => {
                void patchItem(selectedFile, { isTrashed: true }, 'Moved to trash')
                setSelectedId(null)
              }}
            />
          ) : null}
        </section>
      </main>

      {shareFile ? <ShareDialog file={shareFile} onClose={() => setShareFile(null)} onCopy={() => notify('Share link copied')} /> : null}
      {toast ? <Toast message={toast} /> : null}
    </div>
  )
}

function StatusScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="gb-paper-grid flex min-h-screen items-center justify-center px-6 text-[var(--gb-ink)]">
      <section className="border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] p-6 text-center shadow-[var(--gb-shadow-low)]">
        <GyenBoxLogo showSubtitle markClassName="mx-auto h-10 w-10" />
        <h1 className="mt-5 text-lg font-bold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--gb-muted)]">{detail}</p>
      </section>
    </main>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center border border-dashed border-[var(--gb-line-strong)] bg-[rgba(255,253,249,0.52)] text-[13px] text-[var(--gb-muted)]">
      {text}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex h-[72px] items-center gap-3 border-r border-[var(--gb-line)] px-5 last:border-r-0">
      <span className="flex h-9 w-9 items-center justify-center border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] text-[#5F74C4]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="gb-mono text-[10px] font-bold tracking-[0.18em] text-[var(--gb-faint)]">{label}</p>
        <p className="text-[19px] font-bold text-[var(--gb-ink-deep)]">{value}</p>
      </div>
    </div>
  )
}

function FileTile({
  file,
  selected,
  onOpen,
  onSelect,
  onShare,
  onStar,
}: {
  file: FileItem
  selected: boolean
  onOpen: (file: FileItem) => void
  onSelect: () => void
  onShare: () => void
  onStar: () => void
}) {
  const config = typeConfig[file.type]
  const Icon = config.icon

  return (
    <article
      className={`group flex h-[150px] cursor-pointer flex-col border bg-[var(--gb-paper-raised)] p-3 transition ${
        selected ? 'border-[#8896C6] shadow-[0_0_0_1px_rgba(136,150,198,0.52)]' : 'border-[var(--gb-line)] hover:border-[var(--gb-line-strong)] hover:shadow-[var(--gb-shadow-low)]'
      }`}
      onClick={onSelect}
      onDoubleClick={() => onOpen(file)}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center border border-[var(--gb-line)]" style={{ backgroundColor: config.surface, color: config.color }}>
          <Icon className="h-5 w-5" />
        </span>
        <button className="flex h-7 w-7 items-center justify-center text-[var(--gb-faint)] opacity-0 hover:bg-[var(--gb-paper-muted)] hover:text-[var(--gb-ink)] group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); onShare() }} title="Share">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <h3 className="truncate text-[13px] font-bold text-[var(--gb-ink)]" title={file.name}>{file.name}</h3>
      <p className="mt-1 truncate gb-mono text-[10px] text-[var(--gb-muted)]">
        {file.type === 'folder' ? `${file.itemCount ?? 0} items` : file.size ?? '0 KB'} / {file.modifiedAt}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <span className="border border-[var(--gb-line)] px-1.5 py-0.5 gb-mono text-[9px] uppercase tracking-[0.12em] text-[var(--gb-muted)]">{config.label}</span>
        <button className={`flex h-7 w-7 items-center justify-center ${file.starred ? 'text-[#5F74C4]' : 'text-[var(--gb-faint)] hover:text-[#5F74C4]'}`} onClick={(event) => { event.stopPropagation(); onStar() }} title="Star">
          <Star className={`h-3.5 w-3.5 ${file.starred ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
  )
}

function FileRow({
  file,
  selected,
  onOpen,
  onSelect,
  onShare,
  onStar,
}: {
  file: FileItem
  selected: boolean
  onOpen: (file: FileItem) => void
  onSelect: () => void
  onShare: () => void
  onStar: () => void
}) {
  const config = typeConfig[file.type]
  const Icon = config.icon

  return (
    <div
      className={`grid h-11 cursor-pointer grid-cols-[minmax(0,1fr)_120px_110px_86px] items-center gap-3 border-b border-[var(--gb-line)] px-3 text-[13px] last:border-b-0 ${
        selected ? 'bg-[#E7EAF5]' : 'hover:bg-[var(--gb-paper-muted)]'
      }`}
      onClick={onSelect}
      onDoubleClick={() => onOpen(file)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center border border-[var(--gb-line)]" style={{ backgroundColor: config.surface, color: config.color }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate font-bold">{file.name}</span>
      </div>
      <span className="gb-mono text-[10px] text-[var(--gb-muted)]">{file.modifiedAt}</span>
      <span className="gb-mono text-[10px] text-[var(--gb-muted)]">{file.type === 'folder' ? `${file.itemCount ?? 0} items` : file.size ?? '0 KB'}</span>
      <div className="flex justify-end gap-1">
        <button className="flex h-7 w-7 items-center justify-center text-[var(--gb-faint)] hover:bg-[var(--gb-paper)] hover:text-[#5F74C4]" onClick={(event) => { event.stopPropagation(); onStar() }} title="Star">
          <Star className={`h-3.5 w-3.5 ${file.starred ? 'fill-current text-[#5F74C4]' : ''}`} />
        </button>
        <button className="flex h-7 w-7 items-center justify-center text-[var(--gb-faint)] hover:bg-[var(--gb-paper)] hover:text-[var(--gb-ink)]" onClick={(event) => { event.stopPropagation(); onShare() }} title="Share">
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function DetailsPanel({
  file,
  comments,
  activities,
  onClose,
  onShare,
  onDownload,
  onTrash,
}: {
  file: FileItem
  comments: CommentItem[]
  activities: ActivityItem[]
  onClose: () => void
  onShare: () => void
  onDownload: () => void
  onTrash: () => void
}) {
  const config = typeConfig[file.type]
  const Icon = config.icon

  return (
    <aside className="hidden w-[320px] shrink-0 border-l border-[var(--gb-line)] bg-[var(--gb-paper-raised)] lg:flex lg:flex-col">
      <div className="flex h-14 items-center justify-between border-b border-[var(--gb-line)] px-4">
        <div>
          <p className="text-sm font-bold">Details</p>
          <p className="gb-mono text-[10px] text-[var(--gb-faint)]">OBJECT METADATA</p>
        </div>
        <button className="flex h-8 w-8 items-center justify-center text-[var(--gb-muted)] hover:bg-[var(--gb-paper-muted)] hover:text-[var(--gb-ink)]" onClick={onClose} title="Close details">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-[var(--gb-line)] p-4">
        <div className="mb-4 flex h-24 items-center justify-center border border-[var(--gb-line)] bg-[var(--gb-paper)]">
          <span className="flex h-14 w-14 items-center justify-center border border-[var(--gb-line)]" style={{ backgroundColor: config.surface, color: config.color }}>
            <Icon className="h-7 w-7" />
          </span>
        </div>
        <h2 className="truncate text-base font-bold" title={file.name}>{file.name}</h2>
        <p className="mt-1 gb-mono text-[10px] text-[var(--gb-muted)]">{config.label} / {file.modifiedAt}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="flex h-9 items-center justify-center gap-2 bg-[var(--gb-ink)] text-[13px] font-bold text-[var(--gb-paper)] hover:bg-[#2A2A2A]" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </button>
          <button className="flex h-9 items-center justify-center gap-2 border border-[var(--gb-line)] text-[13px] font-bold hover:bg-[var(--gb-paper-muted)]" onClick={onShare}>
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto p-4 gb-scrollbar">
        <div>
          <p className="mb-2 gb-mono text-[10px] font-bold tracking-[0.16em] text-[var(--gb-faint)]">OWNER</p>
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <span className="flex h-7 w-7 items-center justify-center border border-[var(--gb-line)] bg-[var(--gb-paper-muted)] gb-mono text-[10px]">{file.owner.avatar}</span>
            <span className="truncate">{file.owner.name}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 gb-mono text-[10px] font-bold tracking-[0.16em] text-[var(--gb-faint)]">ACTIVITY</p>
          <div className="space-y-2">
            {activities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="border-l border-[#8896C6] pl-2 text-[12px] leading-5 text-[var(--gb-muted)]">
                <span className="font-bold text-[var(--gb-ink)]">{activity.user}</span> {activity.action}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 gb-mono text-[10px] font-bold tracking-[0.16em] text-[var(--gb-faint)]">COMMENTS</p>
          {comments.length ? (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="border border-[var(--gb-line)] bg-[var(--gb-paper)] p-2 text-[12px] leading-5 text-[var(--gb-muted)]">
                  <p className="font-bold text-[var(--gb-ink)]">{comment.user}</p>
                  <p>{comment.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-[var(--gb-line)] bg-[var(--gb-paper)] p-3 text-[12px] text-[var(--gb-muted)]">
              <MessageSquare className="h-4 w-4" />
              No comments yet.
            </div>
          )}
        </div>

        <button className="flex h-9 w-full items-center justify-center gap-2 border border-[#B56B77]/40 text-[13px] font-bold text-[#9B4F5D] hover:bg-[#F4E4E7]" onClick={onTrash}>
          <Trash2 className="h-4 w-4" />
          Move to trash
        </button>
      </div>
    </aside>
  )
}

function ShareDialog({ file, onClose, onCopy }: { file: FileItem; onClose: () => void; onCopy: () => void }) {
  const link = `https://gyenbox.com/s/${file.id}`

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(26,26,26,0.32)] px-4">
      <section className="w-full max-w-[460px] border border-[var(--gb-line-strong)] bg-[var(--gb-paper-raised)] p-5 shadow-[var(--gb-shadow)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">Share {file.name}</h2>
            <p className="mt-1 text-sm text-[var(--gb-muted)]">Create a controlled public link.</p>
          </div>
          <button className="flex h-8 w-8 items-center justify-center text-[var(--gb-muted)] hover:bg-[var(--gb-paper-muted)] hover:text-[var(--gb-ink)]" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-10 items-center gap-2 border border-[var(--gb-line)] bg-[var(--gb-paper)] px-3">
          <Link2 className="h-4 w-4 text-[var(--gb-faint)]" />
          <input className="min-w-0 flex-1 bg-transparent gb-mono text-[11px] text-[#5F74C4] outline-none" readOnly value={link} />
          <button className="flex h-7 items-center gap-1 bg-[var(--gb-ink)] px-2 text-[11px] font-bold text-[var(--gb-paper)] hover:bg-[#2A2A2A]" onClick={() => { void navigator.clipboard?.writeText(link); onCopy() }}>
            <Check className="h-3.5 w-3.5" />
            Copy
          </button>
        </div>
      </section>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-[90] border border-[var(--gb-line-strong)] bg-[var(--gb-ink)] px-4 py-3 text-sm text-[var(--gb-paper)] shadow-[var(--gb-shadow)]">
      {message}
    </div>
  )
}
