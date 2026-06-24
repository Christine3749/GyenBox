'use client'

import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
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
import { INITIAL_ACTIVITIES, INITIAL_COMMENTS, INITIAL_FILES } from './initialData'
import type { ActivityItem, CommentItem, FileItem, FileType } from './types'

type NavId = 'home' | 'files' | 'shared' | 'starred' | 'recent' | 'trash'
type ViewMode = 'grid' | 'list'

type TypeConfig = {
  icon: LucideIcon
  label: string
  color: string
  surface: string
}

const typeConfig: Record<FileType, TypeConfig> = {
  folder: { icon: Folder, label: 'Folder', color: '#AEB9DF', surface: 'rgba(136,150,198,0.13)' },
  png: { icon: ImageIcon, label: 'PNG', color: '#38BDF8', surface: 'rgba(56,189,248,0.11)' },
  jpg: { icon: ImageIcon, label: 'JPG', color: '#38BDF8', surface: 'rgba(56,189,248,0.11)' },
  pdf: { icon: FileText, label: 'PDF', color: '#FB7185', surface: 'rgba(251,113,133,0.11)' },
  docx: { icon: FileText, label: 'DOC', color: '#60A5FA', surface: 'rgba(96,165,250,0.11)' },
  xlsx: { icon: FileSpreadsheet, label: 'XLS', color: '#34D399', surface: 'rgba(52,211,153,0.11)' },
  mp4: { icon: Video, label: 'MP4', color: '#A78BFA', surface: 'rgba(167,139,250,0.11)' },
  zip: { icon: Archive, label: 'ZIP', color: '#AAB2C0', surface: 'rgba(170,178,192,0.09)' },
  txt: { icon: FileText, label: 'TXT', color: '#DDE4FF', surface: 'rgba(136,150,198,0.13)' },
}

const navItems: Array<{ id: NavId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'files', label: 'My files', icon: Folder },
  { id: 'shared', label: 'Shared', icon: Users },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'recent', label: 'Recent', icon: Clock3 },
  { id: 'trash', label: 'Trash', icon: Trash2 },
]

function loadFiles() {
  if (typeof window === 'undefined') return INITIAL_FILES

  try {
    const saved = window.localStorage.getItem('gyenbox_files')
    return saved ? (JSON.parse(saved) as FileItem[]) : INITIAL_FILES
  } catch {
    return INITIAL_FILES
  }
}

function formatStorage(files: FileItem[]) {
  const bytes = files.reduce((total, file) => total + (file.sizeBytes ?? 0), 0)
  const gb = bytes / 1_000_000_000
  return Math.max(5.8, gb).toFixed(1)
}

function titleForTab(tab: NavId, currentFolder: FileItem | null) {
  if (currentFolder) return currentFolder.name
  if (tab === 'home') return 'Command center'
  if (tab === 'files') return 'My files'
  if (tab === 'shared') return 'Shared files'
  if (tab === 'starred') return 'Starred'
  if (tab === 'recent') return 'Recent'
  return 'Trash'
}

export default function GyenboxWorkspace() {
  const [files, setFiles] = useState<FileItem[]>(loadFiles)
  const [activeTab, setActiveTab] = useState<NavId>('home')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shareFile, setShareFile] = useState<FileItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [activities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES)
  const [comments] = useState<Record<string, CommentItem[]>>(INITIAL_COMMENTS)

  useEffect(() => {
    window.localStorage.setItem('gyenbox_files', JSON.stringify(files))
  }, [files])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2800)
  }

  const currentFolder = useMemo(
    () => files.find((file) => file.id === currentFolderId && file.type === 'folder') ?? null,
    [currentFolderId, files],
  )

  const visibleFiles = useMemo(() => {
    let result = files

    if (activeTab === 'trash') {
      result = result.filter((file) => file.isTrash)
    } else {
      result = result.filter((file) => !file.isTrash)
      if (activeTab === 'files' || activeTab === 'home') {
        result = result.filter((file) => file.parentFolderId === currentFolderId)
      }
      if (activeTab === 'shared') result = result.filter((file) => file.shared)
      if (activeTab === 'starred') result = result.filter((file) => file.starred)
      if (activeTab === 'recent') result = result.filter((file) => file.type !== 'folder')
    }

    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery) {
      result = result.filter((file) => file.name.toLowerCase().includes(normalizedQuery))
    }

    return [...result].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })
  }, [activeTab, currentFolderId, files, query])

  const selectedFile = useMemo(() => files.find((file) => file.id === selectedId) ?? null, [files, selectedId])
  const storageUsed = formatStorage(files)
  const sharedCount = files.filter((file) => file.shared && !file.isTrash).length
  const starredCount = files.filter((file) => file.starred && !file.isTrash).length

  function navigateToFolder(folderId: string | null) {
    setCurrentFolderId(folderId)
    setActiveTab('files')
    setSelectedId(null)
  }

  function toggleStar(file: FileItem) {
    setFiles((previous) => previous.map((item) => (item.id === file.id ? { ...item, starred: !item.starred } : item)))
    notify(file.starred ? 'Removed from starred' : 'Added to starred')
  }

  function moveToTrash(file: FileItem) {
    setFiles((previous) => previous.map((item) => (item.id === file.id ? { ...item, isTrash: true } : item)))
    setSelectedId(null)
    notify('Moved to trash')
  }

  function handleOpen(file: FileItem) {
    if (file.type === 'folder') {
      navigateToFolder(file.id)
      return
    }
    notify(`Preparing ${file.name}`)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#08090B] text-[#F4F1EA]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <aside className="relative z-10 flex w-[248px] shrink-0 flex-col border-r border-white/10 bg-[#0B0E13]/95 px-3 py-4">
        <button
          className="mb-6 flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/[0.04]"
          onClick={() => {
            setActiveTab('home')
            setCurrentFolderId(null)
            setSelectedId(null)
          }}
        >
          <GyenBoxLogo showSubtitle markClassName="h-9 w-9" />
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id && !currentFolderId
            return (
              <button
                key={item.id}
                className={`flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm transition ${
                  active ? 'bg-[#8896C6]/12 text-[#DDE4FF]' : 'text-[#AAB2C0] hover:bg-white/[0.04] hover:text-white'
                }`}
                onClick={() => {
                  setActiveTab(item.id)
                  setCurrentFolderId(null)
                  setSelectedId(null)
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-6 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center justify-between text-xs text-[#89919F]">
            <span>Storage</span>
            <span className="font-mono">{storageUsed} / 10 GB</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#8896C6]" style={{ width: `${Math.min(100, Number(storageUsed) * 10)}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-[#7E8796]">
            <span>{sharedCount} shared</span>
            <span>{starredCount} starred</span>
            <span>10GB</span>
          </div>
        </div>

        <div className="mt-auto rounded-md border border-white/10 bg-[#8896C6]/10 p-3 text-xs leading-5 text-[#DDE4FF]">
          <div className="mb-2 flex items-center gap-2 font-semibold text-[#F4F6FF]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure prototype
          </div>
          <p className="text-[#AEB9DF]">Cloud Run demo is live. Storage and OAuth are next.</p>
        </div>
      </aside>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0B0E13]/80 px-5 backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-[#7E8796]">
              <span>GyenBox</span>
              {currentFolder ? (
                <>
                  <span>/</span>
                  <button className="text-[#AAB2C0] hover:text-white" onClick={() => navigateToFolder(null)}>
                    My files
                  </button>
                  <span>/</span>
                  <span className="truncate text-[#F4F1EA]">{currentFolder.name}</span>
                </>
              ) : null}
            </div>
            <h1 className="truncate text-lg font-semibold text-[#F4F1EA]">{titleForTab(activeTab, currentFolder)}</h1>
          </div>

          <div className="relative hidden w-[360px] lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              className="h-9 w-full rounded-md border border-white/10 bg-[#08090B] pl-9 pr-3 text-sm text-[#F4F1EA] outline-none transition placeholder:text-[#586071] focus:border-[#8896C6]/70 focus:ring-2 focus:ring-[#8896C6]/20"
              placeholder="Search files"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <button
            className="flex h-9 items-center gap-2 rounded-md bg-[#8896C6] px-3 text-sm font-semibold text-[#0A0E14] hover:bg-[#7B89BD]"
            onClick={() => notify('Upload engine is next. Demo queue is ready.')}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-[#AAB2C0] hover:bg-white/[0.04] hover:text-white" title="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B202B] text-xs font-semibold text-[#F4F1EA]" title="Account">
            EL
          </button>
        </header>

        <section className="grid shrink-0 grid-cols-1 gap-3 border-b border-white/10 bg-[#08090B]/65 p-5 md:grid-cols-3">
          <Metric icon={HardDrive} label="Storage used" value={`${storageUsed} GB`} detail="Cloud quota preview" />
          <Metric icon={Share2} label="Active shares" value={String(sharedCount)} detail="Links and collaborators" />
          <Metric icon={Activity} label="Recent events" value={String(activities.length)} detail="Audit trail preview" />
        </section>

        <section className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-2 px-5 py-4">
              <div className="relative w-full sm:hidden">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <input
                  className="h-9 w-full rounded-md border border-white/10 bg-[#0B0E13] pl-9 pr-3 text-sm text-[#F4F1EA] outline-none placeholder:text-[#586071] focus:border-[#8896C6]/70"
                  placeholder="Search files"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <button
                className="flex h-8 items-center gap-2 rounded-md border border-white/10 px-2.5 text-xs font-medium text-[#AAB2C0] hover:bg-white/[0.04] hover:text-white"
                onClick={() => notify('Folder creation is next.')}
              >
                <Folder className="h-3.5 w-3.5" />
                New folder
              </button>
              <button
                className={`ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-white/10 ${viewMode === 'grid' ? 'bg-white/[0.08] text-white' : 'text-[#7E8796]'}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={`flex h-8 w-8 items-center justify-center rounded-md border border-white/10 ${viewMode === 'list' ? 'bg-white/[0.08] text-white' : 'text-[#7E8796]'}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              {visibleFiles.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-md border border-dashed border-white/10 text-sm text-[#7E8796]">
                  No files in this view.
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
                  {visibleFiles.map((file) => (
                    <FileTile
                      key={file.id}
                      file={file}
                      selected={file.id === selectedId}
                      onOpen={handleOpen}
                      onSelect={() => setSelectedId(file.id)}
                      onShare={() => setShareFile(file)}
                      onStar={() => toggleStar(file)}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-white/10 bg-[#0B0E13]/70">
                  {visibleFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      selected={file.id === selectedId}
                      onOpen={handleOpen}
                      onSelect={() => setSelectedId(file.id)}
                      onShare={() => setShareFile(file)}
                      onStar={() => toggleStar(file)}
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
              onDownload={() => notify(`Preparing ${selectedFile.name}`)}
              onTrash={() => moveToTrash(selectedFile)}
            />
          ) : null}
        </section>
      </main>

      {shareFile ? <ShareDialog file={shareFile} onClose={() => setShareFile(null)} onCopy={() => notify('Share link copied')} /> : null}
      {toast ? <Toast message={toast} /> : null}
    </div>
  )
}

function Metric({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0B0E13]/80 p-3">
      <div className="mb-3 flex items-center justify-between text-[#7E8796]">
        <span className="text-xs font-medium">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-mono text-2xl text-[#F4F1EA]">{value}</p>
      <p className="mt-1 text-xs text-[#697386]">{detail}</p>
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
      className={`group flex h-[162px] cursor-pointer flex-col rounded-md border bg-[#0B0E13]/86 p-3 transition ${
        selected ? 'border-[#8896C6]/80 shadow-[0_0_0_1px_rgba(136,150,198,0.34)]' : 'border-white/10 hover:border-white/20 hover:bg-[#111620]'
      }`}
      onClick={onSelect}
      onDoubleClick={() => onOpen(file)}
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-md" style={{ backgroundColor: config.surface, color: config.color }}>
          <Icon className="h-5 w-5" />
        </span>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] opacity-0 transition hover:bg-white/[0.06] hover:text-white group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation()
            onShare()
          }}
          title="Share"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-[#F4F1EA]" title={file.name}>
          {file.name}
        </h3>
        <p className="mt-1 truncate font-mono text-[11px] text-[#7E8796]">
          {file.type === 'folder' ? `${file.itemCount ?? 0} items` : file.size ?? '0 KB'} · {file.modifiedAt}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#89919F]">{config.label}</span>
        <button
          className={`flex h-7 w-7 items-center justify-center rounded-md ${file.starred ? 'text-[#DDE4FF]' : 'text-[#586071] hover:text-[#DDE4FF]'}`}
          onClick={(event) => {
            event.stopPropagation()
            onStar()
          }}
          title={file.starred ? 'Remove from starred' : 'Add to starred'}
        >
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
      className={`grid h-12 cursor-pointer grid-cols-[minmax(0,1fr)_110px_110px_88px] items-center gap-3 border-b border-white/10 px-3 text-sm last:border-b-0 ${
        selected ? 'bg-[#8896C6]/10' : 'hover:bg-white/[0.035]'
      }`}
      onClick={onSelect}
      onDoubleClick={() => onOpen(file)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: config.surface, color: config.color }}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate font-medium text-[#F4F1EA]">{file.name}</span>
      </div>
      <span className="font-mono text-xs text-[#7E8796]">{file.modifiedAt}</span>
      <span className="font-mono text-xs text-[#7E8796]">{file.type === 'folder' ? `${file.itemCount ?? 0} items` : file.size ?? '0 KB'}</span>
      <div className="flex justify-end gap-1">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-white/[0.06] hover:text-[#DDE4FF]"
          onClick={(event) => {
            event.stopPropagation()
            onStar()
          }}
          title="Star"
        >
          <Star className={`h-3.5 w-3.5 ${file.starred ? 'fill-current text-[#DDE4FF]' : ''}`} />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-white/[0.06] hover:text-white"
          onClick={(event) => {
            event.stopPropagation()
            onShare()
          }}
          title="Share"
        >
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
    <aside className="hidden w-[330px] shrink-0 border-l border-white/10 bg-[#0B0E13]/95 lg:flex lg:flex-col">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#F4F1EA]">Details</p>
          <p className="text-xs text-[#7E8796]">Object metadata</p>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-[#7E8796] hover:bg-white/[0.05] hover:text-white" onClick={onClose} title="Close details">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-white/10 p-4">
        <div className="mb-4 flex h-24 items-center justify-center rounded-md border border-white/10 bg-white/[0.025]">
          <span className="flex h-14 w-14 items-center justify-center rounded-md" style={{ backgroundColor: config.surface, color: config.color }}>
            <Icon className="h-7 w-7" />
          </span>
        </div>
        <h2 className="truncate text-base font-semibold text-[#F4F1EA]" title={file.name}>
          {file.name}
        </h2>
        <p className="mt-1 font-mono text-xs text-[#7E8796]">{config.label} · {file.modifiedAt}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#8896C6] text-sm font-semibold text-[#0A0E14] hover:bg-[#7B89BD]" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </button>
          <button className="flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 text-sm text-[#C7CFDC] hover:bg-white/[0.04] hover:text-white" onClick={onShare}>
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto p-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">Owner</p>
          <div className="flex items-center gap-2 text-sm text-[#C7CFDC]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B202B] text-xs font-semibold text-white">{file.owner.avatar}</span>
            <span className="truncate">{file.owner.name}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">Activity</p>
          <div className="space-y-3">
            {activities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex gap-2 text-xs leading-5 text-[#89919F]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8896C6]" />
                <p>
                  <span className="text-[#F4F1EA]">{activity.user}</span> {activity.action}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">Comments</p>
          {comments.length ? (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-white/10 bg-white/[0.025] p-2 text-xs leading-5 text-[#AAB2C0]">
                  <p className="font-semibold text-[#F4F1EA]">{comment.user}</p>
                  <p>{comment.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] p-3 text-xs text-[#7E8796]">
              <MessageSquare className="h-4 w-4" />
              No comments yet.
            </div>
          )}
        </div>

        <button className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#FB7185]/30 text-sm text-[#FDA4AF] hover:bg-[#FB7185]/10" onClick={onTrash}>
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <section className="w-full max-w-[460px] rounded-lg border border-white/10 bg-[#0B0E13] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[#F4F1EA]">Share {file.name}</h2>
            <p className="mt-1 text-sm text-[#89919F]">Create a controlled public link.</p>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-[#7E8796] hover:bg-white/[0.05] hover:text-white" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-[#08090B] px-3">
          <Link2 className="h-4 w-4 text-[#7E8796]" />
          <input className="min-w-0 flex-1 bg-transparent font-mono text-xs text-[#DDE4FF] outline-none" readOnly value={link} />
          <button
            className="flex h-7 items-center gap-1 rounded-md bg-[#8896C6] px-2 text-xs font-semibold text-[#0A0E14] hover:bg-[#7B89BD]"
            onClick={() => {
              void navigator.clipboard?.writeText(link)
              onCopy()
            }}
          >
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
    <div className="fixed bottom-5 right-5 z-[90] rounded-md border border-white/10 bg-[#111620] px-4 py-3 text-sm text-[#F4F1EA] shadow-2xl">
      {message}
    </div>
  )
}
