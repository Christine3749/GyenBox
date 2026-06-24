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
  Languages,
  Laptop,
  LayoutGrid,
  Link2,
  List,
  LogOut,
  MessageSquare,
  Minus,
  Moon,
  MoreHorizontal,
  Search,
  Share2,
  ShieldCheck,
  Square,
  Star,
  Sun,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react'

import { GyenBoxLogo } from '@/components/brand/gyenbox-logo'
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  setSupabaseBrowserConfig,
  type SupabaseBrowserConfig,
} from '@/lib/supabase-client'
import { INITIAL_ACTIVITIES, INITIAL_COMMENTS } from './initialData'
import type { ActivityItem, CommentItem, FileItem, FileType } from './types'

type NavId = 'home' | 'files' | 'shared' | 'starred' | 'recent' | 'trash'
type ViewMode = 'grid' | 'list'
type AuthStatus = 'loading' | 'ready' | 'unauthenticated' | 'unconfigured'
type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { message?: string } }
type GyenboxWorkspaceProps = { supabaseConfig?: SupabaseBrowserConfig | null }
type TypeConfig = { icon: LucideIcon; label: string; color: string; surface: string }
type PlatformSkin = 'windows' | 'mac'
type ThemeSkin = 'sun' | 'moon'

const copy = {
  en: {
    home: 'Home',
    files: 'My Files',
    shared: 'Shared',
    starred: 'Starred',
    recent: 'Recent',
    trash: 'Trash',
    territory: 'Territory',
    folders: 'Folders',
    noFolders: 'No folders yet.',
    storage: 'Storage',
    sharedMetric: 'Shared',
    recentMetric: 'Recent',
    liveStorage: 'Live storage',
    liveStorageDetail: 'Supabase identity and Google objects are connected.',
    search: 'Search files',
    upload: 'Upload',
    uploading: 'Uploading',
    newFolder: 'New folder',
    forYou: 'For you',
    loadingFiles: 'Loading files...',
    noFiles: 'No files in this view.',
    name: 'Name',
    modified: 'Modified',
    size: 'Size',
    actions: 'Actions',
    details: 'Details',
    objectMetadata: 'Object metadata',
    download: 'Download',
    share: 'Share',
    owner: 'Owner',
    activity: 'Activity',
    comments: 'Comments',
    noComments: 'No comments yet.',
    moveToTrash: 'Move to trash',
    close: 'Close',
    closeDetails: 'Close details',
    gridView: 'Grid view',
    listView: 'List view',
    star: 'Star',
    opening: 'Opening GyenBox',
    checkingSession: 'Checking your secure session.',
    supabaseMissing: 'Supabase key missing',
    supabaseMissingDetail: 'Set NEXT_PUBLIC_SUPABASE_ANON_KEY first.',
    folderPrompt: 'Folder name',
    folderCreated: 'Folder created',
    folderCreateFailed: 'Could not create folder',
    fileUploaded: 'File uploaded',
    filesUploaded: 'files uploaded',
    uploadFailed: 'Upload failed',
    loadFailed: 'Could not load files',
    updateFailed: 'Could not update file',
    downloadFailed: 'Download failed',
    preparing: 'Preparing',
    addedStar: 'Added to starred',
    removedStar: 'Removed from starred',
    movedTrash: 'Moved to trash',
    copied: 'Share link copied',
    shareTitle: 'Share',
    shareDetail: 'Create a controlled public link.',
    copy: 'Copy',
    items: 'items',
    item: 'item',
    itemsUpper: 'ITEMS',
    winLabel: 'Windows',
    macLabel: 'macOS',
    languageLabel: 'Language',
    platformLabel: 'Desktop shell',
    themeLabel: 'Theme',
    sunLabel: 'Sun',
    moonLabel: 'Moon',
  },
  zh: {
    home: '首页',
    files: '我的文件',
    shared: '共享',
    starred: '已星标',
    recent: '最近',
    trash: '回收站',
    territory: '疆域',
    folders: '文件夹',
    noFolders: '还没有文件夹。',
    storage: '存储',
    sharedMetric: '共享',
    recentMetric: '最近',
    liveStorage: '实时存储',
    liveStorageDetail: 'Supabase 身份与 Google 对象存储已连接。',
    search: '搜索文件',
    upload: '上传',
    uploading: '上传中',
    newFolder: '新建文件夹',
    forYou: '为你推荐',
    loadingFiles: '正在加载文件...',
    noFiles: '这个视图里还没有文件。',
    name: '名称',
    modified: '修改时间',
    size: '大小',
    actions: '操作',
    details: '详情',
    objectMetadata: '对象元数据',
    download: '下载',
    share: '分享',
    owner: '所有者',
    activity: '动态',
    comments: '评论',
    noComments: '还没有评论。',
    moveToTrash: '移到回收站',
    close: '关闭',
    closeDetails: '关闭详情',
    gridView: '网格视图',
    listView: '列表视图',
    star: '星标',
    opening: '正在打开 GyenBox',
    checkingSession: '正在检查安全会话。',
    supabaseMissing: 'Supabase 密钥缺失',
    supabaseMissingDetail: '请先设置 NEXT_PUBLIC_SUPABASE_ANON_KEY。',
    folderPrompt: '文件夹名称',
    folderCreated: '文件夹已创建',
    folderCreateFailed: '无法创建文件夹',
    fileUploaded: '文件已上传',
    filesUploaded: '个文件已上传',
    uploadFailed: '上传失败',
    loadFailed: '无法加载文件',
    updateFailed: '无法更新文件',
    downloadFailed: '下载失败',
    preparing: '正在准备',
    addedStar: '已加入星标',
    removedStar: '已取消星标',
    movedTrash: '已移到回收站',
    copied: '分享链接已复制',
    shareTitle: '分享',
    shareDetail: '创建一个受控公开链接。',
    copy: '复制',
    items: '项',
    item: '项',
    itemsUpper: '项',
    winLabel: 'Windows',
    macLabel: 'macOS',
    languageLabel: '语言',
    platformLabel: '桌面外壳',
    themeLabel: '主题',
    sunLabel: '太阳版',
    moonLabel: '月亮版',
  },
} as const

type Locale = keyof typeof copy
type CopyKey = keyof typeof copy.en

function t(locale: Locale, key: CopyKey) {
  return copy[locale][key]
}

function formatItemCount(locale: Locale, count: number) {
  return locale === 'zh' ? `${count} ${t(locale, 'items')}` : `${count} ${count === 1 ? t(locale, 'item') : t(locale, 'items')}`
}

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

function titleForTab(tab: NavId, currentFolder: FileItem | null, locale: Locale) {
  if (currentFolder) return currentFolder.name
  if (tab === 'home') return t(locale, 'territory')
  return t(locale, tab)
}

async function readApi<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(payload?.error?.message ?? 'Request failed')
  }
  return payload.data
}

export default function GyenboxWorkspace({ supabaseConfig }: GyenboxWorkspaceProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localeRef = useRef<Locale>('zh')
  const [session, setSession] = useState<Session | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [files, setFiles] = useState<FileItem[]>([])
  const [storageUsedBytes, setStorageUsedBytes] = useState(0)
  const [storageQuotaBytes, setStorageQuotaBytes] = useState(10 * 1024 * 1024 * 1024)
  const [activeTab, setActiveTab] = useState<NavId>('files')
  const [currentFolder, setCurrentFolder] = useState<FileItem | null>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [locale, setLocale] = useState<Locale>('zh')
  const [platform, setPlatform] = useState<PlatformSkin>('windows')
  const [theme, setTheme] = useState<ThemeSkin>('sun')
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

  useEffect(() => {
    const storedLocale = window.localStorage.getItem('gyenbox.locale')
    if (storedLocale === 'en' || storedLocale === 'zh') setLocale(storedLocale)

    const storedPlatform = window.localStorage.getItem('gyenbox.platform')
    if (storedPlatform === 'windows' || storedPlatform === 'mac') setPlatform(storedPlatform)

    const storedTheme = window.localStorage.getItem('gyenbox.theme')
    if (storedTheme === 'sun' || storedTheme === 'moon') setTheme(storedTheme)
  }, [])

  useEffect(() => {
    localeRef.current = locale
    window.localStorage.setItem('gyenbox.locale', locale)
  }, [locale])

  useEffect(() => {
    window.localStorage.setItem('gyenbox.platform', platform)
  }, [platform])

  useEffect(() => {
    window.localStorage.setItem('gyenbox.theme', theme)
  }, [theme])

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
        notify(error instanceof Error ? error.message : t(localeRef.current, 'loadFailed'))
      } finally {
        setIsLoadingFiles(false)
      }
    },
    [authHeaders, session],
  )

  useEffect(() => {
    setSupabaseBrowserConfig(supabaseConfig ?? null)

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
  }, [supabaseConfig])

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

  const folderTree = useMemo(
    () => files.filter((file) => file.type === 'folder' && !file.isTrash).slice(0, 14),
    [files],
  )
  const recommendedFiles = useMemo(() => visibleFiles.slice(0, 6), [visibleFiles])
  const selectedFile = useMemo(() => files.find((file) => file.id === selectedId) ?? null, [files, selectedId])
  const storagePercent = storageQuotaBytes > 0 ? Math.min(100, (storageUsedBytes / storageQuotaBytes) * 100) : 0
  const accountLabel = session?.user.email?.slice(0, 2).toUpperCase() ?? 'GB'
  const currentTitle = titleForTab(activeTab, currentFolder, locale)

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
      notify(error instanceof Error ? error.message : t(locale, 'updateFailed'))
    }
  }

  async function createFolder() {
    const name = window.prompt(t(locale, 'folderPrompt'))?.trim()
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
      notify(t(locale, 'folderCreated'))
    } catch (error) {
      notify(error instanceof Error ? error.message : t(locale, 'folderCreateFailed'))
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
        throw new Error(payload?.error?.message ?? t(locale, 'downloadFailed'))
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      notify(error instanceof Error ? error.message : `${t(locale, 'preparing')} ${file.name}`)
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
      notify(selected.length === 1 ? t(locale, 'fileUploaded') : locale === 'zh' ? `${selected.length}${t(locale, 'filesUploaded')}` : `${selected.length} ${t(locale, 'filesUploaded')}`)
      void loadFiles(currentFolder?.id ?? null)
    } catch (error) {
      notify(error instanceof Error ? error.message : t(locale, 'uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  async function signOut() {
    if (hasSupabaseBrowserConfig()) await getSupabaseBrowserClient().auth.signOut()
    router.push('/login')
  }

  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return <StatusScreen title={t(locale, 'opening')} detail={t(locale, 'checkingSession')} />
  }

  if (authStatus === 'unconfigured') {
    return <StatusScreen title={t(locale, 'supabaseMissing')} detail={t(locale, 'supabaseMissingDetail')} />
  }

  return (
    <div className={`${theme === 'moon' ? 'gb-workspace-dark' : 'gb-workspace-sun'} flex h-screen overflow-hidden bg-[var(--gb-paper)] text-[var(--gb-ink)]`}>
      <input ref={fileInputRef} className="hidden" type="file" multiple onChange={handleUploadSelection} />

      <aside className="flex w-[280px] shrink-0 flex-col border-r border-[var(--gb-line)] bg-[var(--gb-paper-muted)]">
        <div className="gb-titlebar flex h-9 items-center px-3">
          <WindowChrome platform={platform} locale={locale} onPlatformChange={setPlatform} />
        </div>

        <button
          className="mx-3 mt-4 flex items-center gap-3 border border-transparent px-2 py-2 text-left hover:border-[var(--gb-line)] hover:bg-[var(--gb-paper-raised)]"
          onClick={() => {
            setActiveTab('home')
            setCurrentFolder(null)
            setSelectedId(null)
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
                    ? 'border-[var(--gb-line-strong)] bg-[var(--gb-iris-soft)] font-bold text-[var(--gb-ink-deep)]'
                    : 'border-transparent text-[var(--gb-muted)] hover:border-[var(--gb-line)] hover:bg-[var(--gb-paper-raised)] hover:text-[var(--gb-ink)]'
                }`}
                onClick={() => {
                  setActiveTab(item.id)
                  setCurrentFolder(null)
                  setSelectedId(null)
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{t(locale, item.id)}</span>
              </button>
            )
          })}
        </nav>

        <section className="mx-3 mt-5 min-h-0">
          <div className="mb-2 flex items-center justify-between gb-mono text-[10px] font-bold tracking-[0.16em] text-[var(--gb-faint)]">
            <span>{t(locale, 'folders')}</span>
            <span>{folderTree.length}</span>
          </div>
          <div className="max-h-[270px] overflow-y-auto border border-[var(--gb-line)] bg-[rgba(255,255,255,0.025)] gb-scrollbar">
            {folderTree.length ? (
              folderTree.map((folder) => (
                <button
                  key={folder.id}
                  className={`grid h-9 w-full grid-cols-[16px_1fr] items-center gap-2 border-b border-[var(--gb-line)] px-2 text-left text-[12px] last:border-b-0 ${
                    currentFolder?.id === folder.id
                      ? 'bg-[var(--gb-iris-soft)] text-[var(--gb-ink-deep)]'
                      : 'text-[var(--gb-muted)] hover:bg-[rgba(255,255,255,0.035)] hover:text-[var(--gb-ink)]'
                  }`}
                  onClick={() => navigateToFolder(folder)}
                >
                  <Folder className="h-3.5 w-3.5 text-[#83BDF8]" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))
            ) : (
              <div className="px-2 py-3 text-[12px] leading-5 text-[var(--gb-faint)]">{t(locale, 'noFolders')}</div>
            )}
          </div>
        </section>

        <div className="mx-3 mt-5 border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--gb-muted)]">
            <span>{t(locale, 'storage')}</span>
            <span className="gb-mono">{formatStorage(storageUsedBytes)}</span>
          </div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.08)]">
            <div className="h-full bg-[var(--gb-iris)]" style={{ width: `${storagePercent}%` }} />
          </div>
          <p className="mt-2 gb-mono text-[10px] text-[var(--gb-faint)]">{files.length} {t(locale, 'itemsUpper')} / {formatStorage(storageQuotaBytes)}</p>
        </div>

        <div className="mx-3 mt-auto mb-3 border border-[var(--gb-line)] bg-[rgba(147,164,215,0.09)] p-3 text-[12px] leading-5 text-[var(--gb-muted)]">
          <div className="mb-1 flex items-center gap-2 font-bold text-[var(--gb-ink)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t(locale, 'liveStorage')}
          </div>
          <p>{t(locale, 'liveStorageDetail')}</p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="gb-titlebar flex h-9 shrink-0 items-center justify-between px-4">
          <span className="gb-mono text-[10px] tracking-[0.18em] text-[var(--gb-muted)]">GYENBOX - {currentTitle.toUpperCase()}</span>
          <div className="flex items-center gap-2 text-[11px] text-[var(--gb-muted)]">
            <ThemeSwitch locale={locale} theme={theme} onThemeChange={setTheme} />
            <LanguageSwitch locale={locale} onLocaleChange={setLocale} />
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
                  <button className="hover:text-[var(--gb-ink)]" onClick={() => navigateToFolder(null)}>{t(locale, 'files')}</button>
                  <span>/</span>
                  <span className="truncate text-[var(--gb-ink)]">{currentFolder.name}</span>
                </>
              ) : null}
            </div>
            <h1 className="truncate text-[18px] font-bold leading-tight text-[var(--gb-ink-deep)]">{currentTitle}</h1>
          </div>

          <div className="relative w-[320px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gb-faint)]" />
            <input
              className="h-9 w-full border border-[var(--gb-line)] bg-[var(--gb-paper)] pl-8 pr-3 text-[13px] outline-none placeholder:text-[var(--gb-faint)] focus:border-[var(--gb-iris)]"
              placeholder={t(locale, 'search')}
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
            {isUploading ? t(locale, 'uploading') : t(locale, 'upload')}
          </button>
        </div>

        <section className="grid shrink-0 grid-cols-3 border-b border-[var(--gb-line)] bg-[var(--gb-paper)]">
          <Metric icon={HardDrive} label={t(locale, 'storage')} value={formatStorage(storageUsedBytes)} />
          <Metric icon={Share2} label={t(locale, 'sharedMetric')} value={String(files.filter((file) => file.shared && !file.isTrash).length)} />
          <Metric icon={Clock3} label={t(locale, 'recentMetric')} value={String(files.filter((file) => file.type !== 'folder').length)} />
        </section>

        {recommendedFiles.length ? (
          <section className="shrink-0 border-b border-[var(--gb-line)] bg-[var(--gb-paper)] px-5 py-4">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[var(--gb-ink)]">
              <Clock3 className="h-4 w-4 text-[var(--gb-muted)]" />
              {t(locale, 'forYou')}
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
              {recommendedFiles.map((file) => (
                <QuickFileCard
                  key={file.id}
                  file={file}
                  locale={locale}
                  selected={file.id === selectedId}
                  onOpen={handleOpen}
                  onSelect={() => setSelectedId(file.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col gb-paper-grid">
            <div className="gb-workspace-toolbar flex h-12 shrink-0 items-center gap-2 border-b border-[var(--gb-line)] px-5">
              <button className="inline-flex h-8 items-center gap-2 border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] px-2.5 text-[12px] font-bold hover:bg-[var(--gb-paper-muted)]" onClick={createFolder}>
                <Folder className="h-3.5 w-3.5" />
                {t(locale, 'newFolder')}
              </button>
              <button className={`ml-auto flex h-8 w-8 items-center justify-center border border-[var(--gb-line)] ${viewMode === 'grid' ? 'bg-[var(--gb-iris-soft)] text-[var(--gb-iris)]' : 'bg-[var(--gb-paper-raised)] text-[var(--gb-muted)]'}`} onClick={() => setViewMode('grid')} title={t(locale, 'gridView')}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button className={`flex h-8 w-8 items-center justify-center border border-[var(--gb-line)] ${viewMode === 'list' ? 'bg-[var(--gb-iris-soft)] text-[var(--gb-iris)]' : 'bg-[var(--gb-paper-raised)] text-[var(--gb-muted)]'}`} onClick={() => setViewMode('list')} title={t(locale, 'listView')}>
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 gb-scrollbar">
              {isLoadingFiles ? (
                <EmptyState text={t(locale, 'loadingFiles')} />
              ) : visibleFiles.length === 0 ? (
                <EmptyState text={t(locale, 'noFiles')} />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-3">
                  {visibleFiles.map((file) => (
                    <FileTile
                      key={file.id}
                      file={file}
                      locale={locale}
                      selected={file.id === selectedId}
                      onOpen={handleOpen}
                      onSelect={() => setSelectedId(file.id)}
                      onShare={() => setShareFile(file)}
                      onStar={() => void patchItem(file, { isStarred: !file.starred }, file.starred ? t(locale, 'removedStar') : t(locale, 'addedStar'))}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-[var(--gb-line)] bg-[var(--gb-paper-raised)]">
                  <div className="grid h-9 grid-cols-[minmax(0,1fr)_120px_110px_86px] items-center gap-3 border-b border-[var(--gb-line)] px-3 gb-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gb-faint)]">
                    <span>{t(locale, 'name')}</span>
                    <span>{t(locale, 'modified')}</span>
                    <span>{t(locale, 'size')}</span>
                    <span className="text-right">{t(locale, 'actions')}</span>
                  </div>
                  {visibleFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      locale={locale}
                      selected={file.id === selectedId}
                      onOpen={handleOpen}
                      onSelect={() => setSelectedId(file.id)}
                      onShare={() => setShareFile(file)}
                      onStar={() => void patchItem(file, { isStarred: !file.starred }, file.starred ? t(locale, 'removedStar') : t(locale, 'addedStar'))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedFile ? (
            <DetailsPanel
              file={selectedFile}
              locale={locale}
              comments={comments[selectedFile.id] ?? []}
              activities={activities}
              onClose={() => setSelectedId(null)}
              onShare={() => setShareFile(selectedFile)}
              onDownload={() => void downloadFile(selectedFile)}
              onTrash={() => {
                void patchItem(selectedFile, { isTrashed: true }, t(locale, 'movedTrash'))
                setSelectedId(null)
              }}
            />
          ) : null}
        </section>
      </main>

      {shareFile ? <ShareDialog file={shareFile} locale={locale} onClose={() => setShareFile(null)} onCopy={() => notify(t(locale, 'copied'))} /> : null}
      {toast ? <Toast message={toast} /> : null}
    </div>
  )
}

function WindowChrome({
  platform,
  locale,
  onPlatformChange,
}: {
  platform: PlatformSkin
  locale: Locale
  onPlatformChange: (platform: PlatformSkin) => void
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      {platform === 'mac' ? (
        <div className="flex items-center gap-1.5" aria-label="macOS window controls">
          <span className="h-2.5 w-2.5 rounded-full border border-[rgba(0,0,0,0.25)] bg-[#FF605C]" />
          <span className="h-2.5 w-2.5 rounded-full border border-[rgba(0,0,0,0.25)] bg-[#FFBD44]" />
          <span className="h-2.5 w-2.5 rounded-full border border-[rgba(0,0,0,0.25)] bg-[#00CA4E]" />
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2 text-[var(--gb-muted)]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--gb-line)] bg-[var(--gb-iris-soft)] text-[var(--gb-iris)]">
            <Laptop className="h-3.5 w-3.5" />
          </span>
          <span className="truncate gb-mono text-[9px] font-bold uppercase tracking-[0.14em]">
            GyenBox / {t(locale, 'winLabel')}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex border border-[var(--gb-line)] bg-[rgba(255,255,255,0.025)] p-0.5">
          {(['windows', 'mac'] as const).map((option) => (
            <button
              key={option}
              className={`h-5 px-2 gb-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
                platform === option ? 'bg-[var(--gb-iris-soft)] text-[var(--gb-ink-deep)]' : 'text-[var(--gb-faint)] hover:text-[var(--gb-ink)]'
              }`}
              onClick={() => onPlatformChange(option)}
              title={t(locale, 'platformLabel')}
            >
              {option === 'windows' ? 'WIN' : 'MAC'}
            </button>
          ))}
        </div>

        {platform === 'windows' ? (
          <div className="flex items-center text-[var(--gb-faint)]" aria-label="Windows window controls">
            <span className="flex h-6 w-6 items-center justify-center hover:bg-[rgba(255,255,255,0.04)]">
              <Minus className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-6 w-6 items-center justify-center hover:bg-[rgba(255,255,255,0.04)]">
              <Square className="h-3 w-3" />
            </span>
            <span className="flex h-6 w-6 items-center justify-center hover:bg-[#B56B77] hover:text-white">
              <X className="h-3.5 w-3.5" />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function LanguageSwitch({ locale, onLocaleChange }: { locale: Locale; onLocaleChange: (locale: Locale) => void }) {
  const nextLocale: Locale = locale === 'zh' ? 'en' : 'zh'

  return (
    <button
      className="flex h-6 items-center gap-1.5 border border-[var(--gb-line)] bg-[rgba(255,255,255,0.025)] px-2 text-[var(--gb-muted)] hover:bg-[var(--gb-iris-soft)] hover:text-[var(--gb-ink-deep)]"
      onClick={() => onLocaleChange(nextLocale)}
      title={t(locale, 'languageLabel')}
      aria-label={t(locale, 'languageLabel')}
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="gb-mono text-[9px] font-bold uppercase tracking-[0.12em]">{locale === 'zh' ? '中' : 'EN'}</span>
    </button>
  )
}

function ThemeSwitch({ locale, theme, onThemeChange }: { locale: Locale; theme: ThemeSkin; onThemeChange: (theme: ThemeSkin) => void }) {
  const isSun = theme === 'sun'
  const Icon = isSun ? Sun : Moon
  const nextTheme: ThemeSkin = isSun ? 'moon' : 'sun'

  return (
    <button
      className="flex h-6 w-7 items-center justify-center border border-[var(--gb-line)] bg-[rgba(255,255,255,0.025)] text-[var(--gb-muted)] hover:bg-[var(--gb-iris-soft)] hover:text-[var(--gb-ink-deep)]"
      onClick={() => onThemeChange(nextTheme)}
      title={t(locale, isSun ? 'sunLabel' : 'moonLabel')}
      aria-label={t(locale, 'themeLabel')}
      aria-pressed={isSun}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
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
    <div className="flex h-[220px] items-center justify-center border border-dashed border-[var(--gb-line-strong)] bg-[rgba(255,255,255,0.025)] text-[13px] text-[var(--gb-muted)]">
      {text}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex h-[72px] items-center gap-3 border-r border-[var(--gb-line)] px-5 last:border-r-0">
      <span className="flex h-9 w-9 items-center justify-center border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] text-[var(--gb-iris)]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="gb-mono text-[10px] font-bold tracking-[0.18em] text-[var(--gb-faint)]">{label}</p>
        <p className="text-[19px] font-bold text-[var(--gb-ink-deep)]">{value}</p>
      </div>
    </div>
  )
}

function QuickFileCard({
  file,
  locale,
  selected,
  onOpen,
  onSelect,
}: {
  file: FileItem
  locale: Locale
  selected: boolean
  onOpen: (file: FileItem) => void
  onSelect: () => void
}) {
  const config = typeConfig[file.type]
  const Icon = config.icon

  return (
    <article
      className={`flex h-[68px] cursor-pointer items-center gap-3 border px-3 transition ${
        selected
          ? 'border-[var(--gb-iris)] bg-[var(--gb-iris-soft)]'
          : 'border-[var(--gb-line)] bg-[var(--gb-paper-raised)] hover:border-[var(--gb-line-strong)] hover:bg-[rgba(255,255,255,0.035)]'
      }`}
      onClick={onSelect}
      onDoubleClick={() => onOpen(file)}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--gb-line)]" style={{ backgroundColor: config.surface, color: config.color }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-bold text-[var(--gb-ink-deep)]" title={file.name}>{file.name}</h3>
        <p className="mt-0.5 truncate gb-mono text-[10px] text-[var(--gb-muted)]">
          {file.type === 'folder' ? formatItemCount(locale, file.itemCount ?? 0) : file.size ?? '0 KB'} / {file.modifiedAt}
        </p>
      </div>
    </article>
  )
}
function FileTile({
  file,
  locale,
  selected,
  onOpen,
  onSelect,
  onShare,
  onStar,
}: {
  file: FileItem
  locale: Locale
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
        selected ? 'border-[var(--gb-iris)] shadow-[0_0_0_1px_rgba(147,164,215,0.4)]' : 'border-[var(--gb-line)] hover:border-[var(--gb-line-strong)] hover:shadow-[var(--gb-shadow-low)]'
      }`}
      onClick={onSelect}
      onDoubleClick={() => onOpen(file)}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center border border-[var(--gb-line)]" style={{ backgroundColor: config.surface, color: config.color }}>
          <Icon className="h-5 w-5" />
        </span>
        <button className="flex h-7 w-7 items-center justify-center text-[var(--gb-faint)] opacity-0 hover:bg-[var(--gb-paper-muted)] hover:text-[var(--gb-ink)] group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); onShare() }} title={t(locale, 'share')}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <h3 className="truncate text-[13px] font-bold text-[var(--gb-ink)]" title={file.name}>{file.name}</h3>
      <p className="mt-1 truncate gb-mono text-[10px] text-[var(--gb-muted)]">
        {file.type === 'folder' ? formatItemCount(locale, file.itemCount ?? 0) : file.size ?? '0 KB'} / {file.modifiedAt}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <span className="border border-[var(--gb-line)] px-1.5 py-0.5 gb-mono text-[9px] uppercase tracking-[0.12em] text-[var(--gb-muted)]">{config.label}</span>
        <button className={`flex h-7 w-7 items-center justify-center ${file.starred ? 'text-[var(--gb-iris)]' : 'text-[var(--gb-faint)] hover:text-[var(--gb-iris)]'}`} onClick={(event) => { event.stopPropagation(); onStar() }} title={t(locale, 'star')}>
          <Star className={`h-3.5 w-3.5 ${file.starred ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
  )
}

function FileRow({
  file,
  locale,
  selected,
  onOpen,
  onSelect,
  onShare,
  onStar,
}: {
  file: FileItem
  locale: Locale
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
        selected ? 'bg-[var(--gb-iris-soft)]' : 'hover:bg-[rgba(255,255,255,0.035)]'
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
      <span className="gb-mono text-[10px] text-[var(--gb-muted)]">{file.type === 'folder' ? formatItemCount(locale, file.itemCount ?? 0) : file.size ?? '0 KB'}</span>
      <div className="flex justify-end gap-1">
        <button className="flex h-7 w-7 items-center justify-center text-[var(--gb-faint)] hover:bg-[var(--gb-paper)] hover:text-[var(--gb-iris)]" onClick={(event) => { event.stopPropagation(); onStar() }} title={t(locale, 'star')}>
          <Star className={`h-3.5 w-3.5 ${file.starred ? 'fill-current text-[var(--gb-iris)]' : ''}`} />
        </button>
        <button className="flex h-7 w-7 items-center justify-center text-[var(--gb-faint)] hover:bg-[var(--gb-paper)] hover:text-[var(--gb-ink)]" onClick={(event) => { event.stopPropagation(); onShare() }} title={t(locale, 'share')}>
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function DetailsPanel({
  file,
  locale,
  comments,
  activities,
  onClose,
  onShare,
  onDownload,
  onTrash,
}: {
  file: FileItem
  locale: Locale
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
          <p className="text-sm font-bold">{t(locale, 'details')}</p>
          <p className="gb-mono text-[10px] text-[var(--gb-faint)]">{t(locale, 'objectMetadata').toUpperCase()}</p>
        </div>
        <button className="flex h-8 w-8 items-center justify-center text-[var(--gb-muted)] hover:bg-[var(--gb-paper-muted)] hover:text-[var(--gb-ink)]" onClick={onClose} title={t(locale, 'closeDetails')}>
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
            {t(locale, 'download')}
          </button>
          <button className="flex h-9 items-center justify-center gap-2 border border-[var(--gb-line)] text-[13px] font-bold hover:bg-[var(--gb-paper-muted)]" onClick={onShare}>
            <Share2 className="h-4 w-4" />
            {t(locale, 'share')}
          </button>
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto p-4 gb-scrollbar">
        <div>
          <p className="mb-2 gb-mono text-[10px] font-bold tracking-[0.16em] text-[var(--gb-faint)]">{t(locale, 'owner').toUpperCase()}</p>
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <span className="flex h-7 w-7 items-center justify-center border border-[var(--gb-line)] bg-[var(--gb-paper-muted)] gb-mono text-[10px]">{file.owner.avatar}</span>
            <span className="truncate">{file.owner.name}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 gb-mono text-[10px] font-bold tracking-[0.16em] text-[var(--gb-faint)]">{t(locale, 'activity').toUpperCase()}</p>
          <div className="space-y-2">
            {activities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="border-l border-[#8896C6] pl-2 text-[12px] leading-5 text-[var(--gb-muted)]">
                <span className="font-bold text-[var(--gb-ink)]">{activity.user}</span> {activity.action}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 gb-mono text-[10px] font-bold tracking-[0.16em] text-[var(--gb-faint)]">{t(locale, 'comments').toUpperCase()}</p>
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
              {t(locale, 'noComments')}
            </div>
          )}
        </div>

        <button className="flex h-9 w-full items-center justify-center gap-2 border border-[#B56B77]/40 text-[13px] font-bold text-[#9B4F5D] hover:bg-[#F4E4E7]" onClick={onTrash}>
          <Trash2 className="h-4 w-4" />
          {t(locale, 'moveToTrash')}
        </button>
      </div>
    </aside>
  )
}

function ShareDialog({ file, locale, onClose, onCopy }: { file: FileItem; locale: Locale; onClose: () => void; onCopy: () => void }) {
  const link = `https://gyenbox.com/s/${file.id}`

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(26,26,26,0.32)] px-4">
      <section className="w-full max-w-[460px] border border-[var(--gb-line-strong)] bg-[var(--gb-paper-raised)] p-5 shadow-[var(--gb-shadow)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{t(locale, 'shareTitle')} {file.name}</h2>
            <p className="mt-1 text-sm text-[var(--gb-muted)]">{t(locale, 'shareDetail')}</p>
          </div>
          <button className="flex h-8 w-8 items-center justify-center text-[var(--gb-muted)] hover:bg-[var(--gb-paper-muted)] hover:text-[var(--gb-ink)]" onClick={onClose} title={t(locale, 'close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-10 items-center gap-2 border border-[var(--gb-line)] bg-[var(--gb-paper)] px-3">
          <Link2 className="h-4 w-4 text-[var(--gb-faint)]" />
          <input className="min-w-0 flex-1 bg-transparent gb-mono text-[11px] text-[var(--gb-iris)] outline-none" readOnly value={link} />
          <button className="flex h-7 items-center gap-1 bg-[var(--gb-ink)] px-2 text-[11px] font-bold text-[var(--gb-paper)] hover:bg-[#2A2A2A]" onClick={() => { void navigator.clipboard?.writeText(link); onCopy() }}>
            <Check className="h-3.5 w-3.5" />
            {t(locale, 'copy')}
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
