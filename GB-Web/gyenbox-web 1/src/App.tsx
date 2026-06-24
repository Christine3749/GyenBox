import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FolderPlus, AlertTriangle, UploadCloud, ChevronRight, X, Trash2, ArrowUpCircle 
} from 'lucide-react';
import { FileItem, UploadProgress, ToastMessage, FileType } from './types';
import { INITIAL_FILES } from './initialData';

// Component Imports
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import FileGrid from './components/FileGrid';
import DetailPanel from './components/DetailPanel';
import ContextMenu from './components/ContextMenu';
import UploadDrawer from './components/UploadDrawer';
import ShareModal from './components/ShareModal';
import ToastContainer from './components/ToastContainer';

export default function App() {
  // --- STATES ---
  const [files, setFiles] = useState<FileItem[]>(() => {
    const saved = localStorage.getItem('gyenbox_files');
    return saved ? JSON.parse(saved) : INITIAL_FILES;
  });

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeSidebarTab, setActiveSidebarTab] = useState('home');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<'name' | 'size' | 'modified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Overlays and detail panel states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null);
  const [shareModalFileId, setShareModalFileId] = useState<string | null>(null);
  const [detailPanelFileId, setDetailPanelFileId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(true);

  // Initial uploads inside progress drawer as requested
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([
    { id: 'up-1', name: 'Brand_Logo.png', type: 'png', progress: 68, status: 'uploading' },
    { id: 'up-2', name: 'Notes.docx', type: 'docx', progress: 100, status: 'done' },
    { id: 'up-3', name: 'archive.zip', type: 'zip', progress: 23, status: 'uploading' },
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync files state to LocalStorage
  useEffect(() => {
    localStorage.setItem('gyenbox_files', JSON.stringify(files));
  }, [files]);

  // --- TOAST NOTIFICATIONS HELPER ---
  const addToast = (
    title: string,
    body: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const newToast: ToastMessage = {
      id: Math.random().toString(),
      title,
      body,
      type,
      progress: 100,
    };
    setToasts((prev) => [newToast, ...prev]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Welcome toast 1s after page load
  useEffect(() => {
    const timer = setTimeout(() => {
      addToast('Welcome to Gyenbox', 'Your territory is ready.', 'info');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // --- SIMULATED UPLOAD LOOPER (setInterval) ---
  useEffect(() => {
    const activeUploads = uploadQueue.filter((item) => item.status === 'uploading');
    if (activeUploads.length === 0) return;

    const interval = setInterval(() => {
      setUploadQueue((prevQueue) => {
        let queueChanged = false;
        const nextQueue = prevQueue.map((item) => {
          if (item.status !== 'uploading') return item;

          queueChanged = true;
          const nextProgress = item.progress + Math.random() * 15 + 5; // increment by 5% - 20%
          
          if (nextProgress >= 100) {
            // Trigger file added to local catalog when done!
            setTimeout(() => {
              // Check if already in file list to prevent double additions
              setFiles((prevFiles) => {
                const alreadyExists = prevFiles.some(f => f.name === item.name && f.parentId === currentFolderId);
                if (alreadyExists) return prevFiles;

                const newFile: FileItem = {
                  id: 'file-' + Math.random().toString(),
                  name: item.name,
                  type: item.type,
                  parentId: currentFolderId,
                  size: '2.4 MB',
                  sizeBytes: 2516582,
                  modifiedText: 'Just now',
                  createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  isStarred: false,
                  isRecent: true,
                  badge: item.type.toUpperCase(),
                  tags: ['uploaded'],
                  ownerName: 'Ethan Li',
                  ownerAvatar: 'EL'
                };
                return [...prevFiles, newFile];
              });
              addToast('Upload Complete', `${item.name} has been saved successfully.`, 'success');
            }, 100);

            return { ...item, progress: 100, status: 'done' as const };
          }

          return { ...item, progress: nextProgress };
        });

        return queueChanged ? nextQueue : prevQueue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [uploadQueue, currentFolderId]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if focusing input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // ⌘K or Ctrl-K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape: Close all overlays, menus, detail panels
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setContextMenu(null);
        setShareModalFileId(null);
        setDetailPanelFileId(null);
      }

      // ⌘S or Ctrl-S: Share first selected
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (selectedIds.size > 0) {
          const firstId = Array.from(selectedIds)[0];
          setShareModalFileId(firstId);
        } else {
          addToast('Selection Required', 'Please select an item to share.', 'warning');
        }
      }

      // ⌘D or Ctrl-D: Download first selected
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedIds.size > 0) {
          const firstId = Array.from(selectedIds)[0];
          const fileToDownload = files.find((f) => f.id === firstId);
          if (fileToDownload) {
            handleDownloadFile(fileToDownload);
          }
        } else {
          addToast('Selection Required', 'Select an item to download.', 'warning');
        }
      }

      // Delete or Backspace: Trash selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          handleTrashSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, files]);

  // --- FILE HANDLING METHODS ---
  const handleDownloadFile = (file: FileItem) => {
    addToast('Downloading File', `Starting download for "${file.name}" (${file.size})...`, 'info');
    setTimeout(() => {
      addToast('Download Finished', `"${file.name}" saved to downloads.`, 'success');
    }, 1500);
  };

  const handleTrashSelected = () => {
    const list = Array.from(selectedIds);
    if (list.length === 0) return;

    setFiles((prev) =>
      prev.map((f) => {
        if (list.includes(f.id)) {
          return { ...f, isTrash: true };
        }
        return f;
      })
    );
    setSelectedIds(new Set());
    setDetailPanelFileId(null);
    addToast(
      'Moved to Trash',
      `${list.length} item${list.length > 1 ? 's' : ''} moved to Trash.`,
      'warning'
    );
  };

  const handleRestoreSelected = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          return { ...f, isTrash: false };
        }
        return f;
      })
    );
    setSelectedIds(new Set());
    addToast('Item Restored', 'The item has been restored successfully.', 'success');
  };

  const handleDeletePermanently = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedIds(new Set());
    setDetailPanelFileId(null);
    addToast('Deleted Permanently', 'The item was deleted from Gyenbox cloud.', 'error');
  };

  const handleUpdateTags = (fileId: string, tags: string[]) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, tags } : f))
    );
  };

  const handleAddNewFolder = () => {
    const name = prompt('Enter a folder name:', 'New_Folder');
    if (!name || !name.trim()) return;

    const trimmed = name.trim().replace(/\s+/g, '_');
    
    // Check if duplicate name in current folder
    const exists = files.some(f => f.name.toLowerCase() === trimmed.toLowerCase() && f.parentId === currentFolderId && !f.isTrash);
    if (exists) {
      addToast('Folder Exists', 'A folder with that name already exists here.', 'error');
      return;
    }

    const newFolder: FileItem = {
      id: 'folder-' + Math.random().toString(),
      name: trimmed,
      type: 'folder',
      parentId: currentFolderId,
      size: '0 Bytes',
      sizeBytes: 0,
      modifiedText: 'Just now',
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      itemCount: 0,
      isStarred: false,
      tags: [],
      ownerName: 'Ethan Li',
      ownerAvatar: 'EL'
    };

    setFiles((prev) => [newFolder, ...prev]);
    addToast('Folder Created', `"${trimmed}" created successfully.`, 'success');
  };

  const handleRenameFile = (file: FileItem) => {
    const newName = prompt(`Rename "${file.name}" to:`, file.name);
    if (!newName || !newName.trim()) return;

    const trimmed = newName.trim();
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, name: trimmed, modifiedText: 'Just now' } : f))
    );
    addToast('Item Renamed', `"${file.name}" is now "${trimmed}".`, 'success');
  };

  const handleToggleStar = (file: FileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, isStarred: !f.isStarred } : f))
    );
    addToast(
      file.isStarred ? 'Removed Star' : 'Added Star',
      file.isStarred ? `"${file.name}" unstarred.` : `"${file.name}" starred.`,
      'info'
    );
  };

  const handleDuplicateFile = (file: FileItem) => {
    const dotIndex = file.name.lastIndexOf('.');
    let copyName = '';
    if (dotIndex !== -1) {
      copyName = file.name.substring(0, dotIndex) + '_Copy' + file.name.substring(dotIndex);
    } else {
      copyName = file.name + '_Copy';
    }

    const duplicatedItem: FileItem = {
      ...file,
      id: 'file-' + Math.random().toString(),
      name: copyName,
      modifiedText: 'Just now',
      isStarred: false,
    };

    setFiles((prev) => [...prev, duplicatedItem]);
    addToast('Item Duplicated', `Created copy as "${copyName}".`, 'success');
  };

  const handleMoveFilePrompt = (file: FileItem) => {
    // Collect non-trashed, non-file folders
    const availableFolders = files.filter(f => f.type === 'folder' && !f.isTrash && f.id !== file.id);
    if (availableFolders.length === 0) {
      addToast('No Folders Available', 'Create some folders first to move items.', 'warning');
      return;
    }

    const msg = `Move "${file.name}" to which folder?\nAvailable folders:\n` + 
      availableFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n') + 
      `\n\n(Enter name or number, or enter "root" for root folder)`;

    const input = prompt(msg);
    if (!input) return;

    const target = input.trim().toLowerCase();
    if (target === 'root') {
      setFiles((prev) => prev.map(f => f.id === file.id ? { ...f, parentId: null } : f));
      addToast('Item Moved', `Moved "${file.name}" to My Files root.`, 'success');
      return;
    }

    // Try finding by number or name
    const num = parseInt(target, 10);
    let targetFolder: FileItem | undefined = undefined;
    if (!isNaN(num) && num > 0 && num <= availableFolders.length) {
      targetFolder = availableFolders[num - 1];
    } else {
      targetFolder = availableFolders.find(f => f.name.toLowerCase() === target);
    }

    if (targetFolder) {
      setFiles((prev) => prev.map(f => f.id === file.id ? { ...f, parentId: targetFolder!.id } : f));
      addToast('Item Moved', `Moved "${file.name}" into "${targetFolder.name}".`, 'success');
    } else {
      addToast('Invalid Destination', 'Specified folder was not found.', 'error');
    }
  };

  // --- SELECTION CONTROL ---
  const handleSelectFile = (id: string, e: React.MouseEvent) => {
    const newSelected = new Set(selectedIds);
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    } else {
      if (newSelected.size === 1 && newSelected.has(id)) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add(id);
      }
    }
    setSelectedIds(newSelected);

    // Slide detail panel on single click selection of an item
    if (newSelected.has(id)) {
      setDetailPanelFileId(id);
    } else {
      setDetailPanelFileId(null);
    }
  };

  const handleFolderDoubleClick = (folder: FileItem) => {
    setCurrentFolderId(folder.id);
    setSelectedIds(new Set());
    setDetailPanelFileId(null);
  };

  // --- CONTEXT MENU DISPATCHER ---
  const handleFileContextMenu = (e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    // Select clicked file if not selected
    if (!selectedIds.has(file.id)) {
      setSelectedIds(new Set([file.id]));
      setDetailPanelFileId(file.id);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId: file.id,
    });
  };

  const handleContextMenuAction = (action: string, file: FileItem) => {
    switch (action) {
      case 'preview':
        if (file.type === 'folder') {
          handleFolderDoubleClick(file);
        } else {
          setDetailPanelFileId(file.id);
        }
        break;
      case 'download':
        handleDownloadFile(file);
        break;
      case 'share':
        setShareModalFileId(file.id);
        break;
      case 'rename':
        handleRenameFile(file);
        break;
      case 'copy':
        handleDuplicateFile(file);
        break;
      case 'move':
        handleMoveFilePrompt(file);
        break;
      case 'star':
        handleToggleStar(file);
        break;
      case 'trash':
        if (file.isTrash) {
          handleRestoreSelected(file.id);
        } else {
          handleTrashSelected();
        }
        break;
      default:
        break;
    }
  };

  // --- BREADCRUMB BUILDER ---
  const currentPath = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'My Files' }];
    if (!currentFolderId) return path;

    const accum: { id: string | null; name: string }[] = [];
    let currentId: string | null = currentFolderId;
    let safetyCounter = 0;

    while (currentId && safetyCounter < 10) {
      safetyCounter++;
      const folder = files.find((f) => f.id === currentId);
      if (folder) {
        accum.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId;
      } else {
        break;
      }
    }

    return [...path, ...accum];
  }, [currentFolderId, files]);

  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
    setDetailPanelFileId(null);
    setActiveSidebarTab('my-files');
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    if (droppedFiles.length === 0) return;

    handleTriggerUpload(droppedFiles);
  };

  const handleTriggerUpload = (fileList: File[]) => {
    setIsUploadDrawerOpen(true);
    addToast('Uploading File', `Adding ${fileList.length} files to upload queue.`, 'info');

    const newUploads = fileList.map((f) => {
      const extension = f.name.split('.').pop()?.toLowerCase() || '';
      let fileType: FileType = 'txt';
      if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) fileType = 'png';
      else if (extension === 'pdf') fileType = 'pdf';
      else if (['doc', 'docx'].includes(extension)) fileType = 'docx';
      else if (['xls', 'xlsx'].includes(extension)) fileType = 'xlsx';
      else if (extension === 'mp4') fileType = 'mp4';
      else if (['zip', 'rar', 'tar', '7z'].includes(extension)) fileType = 'zip';

      return {
        id: 'up-' + Math.random().toString(),
        name: f.name,
        type: fileType,
        progress: 0,
        status: 'uploading' as const,
      };
    });

    setUploadQueue((prev) => [...newUploads, ...prev]);
  };

  const handleManualUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleTriggerUpload(Array.from(e.target.files));
    }
  };

  // --- ACTIVE FILES FILTER & SORT ENGINE ---
  const activeDisplayFiles = useMemo(() => {
    // 1. Sidebar tab filtering
    let filtered = files;

    switch (activeSidebarTab) {
      case 'home':
        // Show non-trashed folders & recent items
        filtered = files.filter((f) => !f.isTrash && (f.type === 'folder' || f.isRecent));
        break;
      case 'my-files':
        // Only items in current directory path
        filtered = files.filter((f) => f.parentId === currentFolderId && !f.isTrash);
        break;
      case 'shared':
        // Mock shared items: has owners SC or MV, or manually flag. Let's filter items with Sophia/Marcus
        filtered = files.filter((f) => !f.isTrash && (f.ownerName === 'Sophia Chen' || f.ownerName === 'Marcus Vance'));
        break;
      case 'starred':
        filtered = files.filter((f) => f.isStarred && !f.isTrash);
        break;
      case 'recent':
        filtered = files.filter((f) => f.isRecent && !f.isTrash);
        break;
      case 'trash':
        filtered = files.filter((f) => f.isTrash);
        break;
      case 'requests':
        filtered = files.filter((f) => !f.isTrash && f.tags?.includes('request'));
        break;
      case 'docs':
        filtered = files.filter((f) => !f.isTrash && ['docx', 'xlsx', 'txt', 'pdf'].includes(f.type));
        break;
      default:
        break;
    }

    // 2. Search query filtering
    if (searchQuery.trim()) {
      const term = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((f) => f.name.toLowerCase().includes(term));
    }

    // 3. Sorting engine (Folders always sorted first, then files)
    const sorted = [...filtered].sort((a, b) => {
      // Folders on top
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      // Handle custom sorting fields
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'size') {
        comparison = a.sizeBytes - b.sizeBytes;
      } else if (sortField === 'modified') {
        // Simple comparison of modified texts or created dates
        comparison = a.createdDate.localeCompare(b.createdDate);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [files, activeSidebarTab, currentFolderId, searchQuery, sortField, sortOrder]);

  const sidebarTabLabel = useMemo(() => {
    switch (activeSidebarTab) {
      case 'home': return 'Home Catalog';
      case 'my-files': return currentPath[currentPath.length - 1]?.name || 'My Files';
      case 'shared': return 'Shared with me';
      case 'starred': return 'Starred Favorites';
      case 'recent': return 'Recent Files';
      case 'trash': return 'Trash Bin';
      case 'requests': return 'File Requests';
      case 'docs': return 'Documents';
      default: return 'Files';
    }
  }, [activeSidebarTab, currentPath]);

  // File for Share Modal
  const fileToShare = useMemo(() => {
    if (!shareModalFileId) return null;
    return files.find((f) => f.id === shareModalFileId) || null;
  }, [shareModalFileId, files]);

  // File for Detail Panel
  const fileForDetails = useMemo(() => {
    if (!detailPanelFileId) return null;
    return files.find((f) => f.id === detailPanelFileId) || null;
  }, [detailPanelFileId, files]);

  return (
    <div className="h-screen w-screen bg-page-bg text-text-primary flex flex-col overflow-hidden relative font-sans selection:bg-accent selection:text-white">
      
      {/* Hidden manual file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleManualFileChange}
        className="hidden"
      />

      {/* TOPBAR */}
      <Topbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onUploadClick={handleManualUploadClick}
        currentPath={currentPath}
        onBreadcrumbClick={handleBreadcrumbClick}
        searchInputRef={searchInputRef}
        notificationCount={1}
        onNotificationClick={() => addToast('System Log', 'No new critical security notifications.', 'success')}
      />

      {/* SHELL WRAPPER */}
      <div className="flex flex-1 h-[calc(100vh-56px)] overflow-hidden w-full relative">
        
        {/* SIDEBAR */}
        <Sidebar
          activeTab={activeSidebarTab}
          onTabChange={(tab) => {
            setActiveSidebarTab(tab);
            setSelectedIds(new Set());
            setDetailPanelFileId(null);
            if (tab === 'my-files') {
              setCurrentFolderId(null);
            }
          }}
          files={files}
          onUpgradeClick={() => addToast('Storage Upgrade', 'Professional Cloud 100GB package details sent to ethan@gsyen.org.', 'success')}
        />

        {/* MAIN DISPLAY AREA */}
        <main 
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          className="flex-1 flex flex-col overflow-hidden relative dot-grid"
        >
          {/* TOOLBAR */}
          <Toolbar
            title={sidebarTabLabel}
            onNewFolderClick={handleAddNewFolder}
            showNewFolderButton={activeSidebarTab === 'my-files' || activeSidebarTab === 'home'}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={(field, order) => {
              setSortField(field);
              setSortOrder(order);
              addToast('Sorted Files', `Sorting active list by ${field} ${order === 'asc' ? 'ascending' : 'descending'}.`, 'info');
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* DRAG OVERLAY */}
          {isDragOver && (
            <div 
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="absolute inset-2 border-2 border-dashed border-accent rounded-2xl bg-[#07070E]/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 text-center pointer-events-auto transition-all animate-in fade-in duration-150"
            >
              <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent animate-bounce">
                <UploadCloud size={28} />
              </div>
              <div>
                <h2 className="font-sans font-bold text-lg text-text-primary">
                  Drop files anywhere
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  or folders — we preserve the structure instantly
                </p>
              </div>
            </div>
          )}

          {/* MAIN GRID/LIST CONTAINER */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-6">
            <FileGrid
              files={activeDisplayFiles}
              selectedIds={selectedIds}
              onSelect={handleSelectFile}
              onDoubleClick={handleFolderDoubleClick}
              onFileContextMenu={handleFileContextMenu}
              viewMode={viewMode}
              activeTab={activeSidebarTab}
            />
          </div>
        </main>

        {/* DETAIL PANEL (Slides in from right when file selected) */}
        {fileForDetails && (
          <DetailPanel
            file={fileForDetails}
            onClose={() => setDetailPanelFileId(null)}
            onDownload={handleDownloadFile}
            onShare={(file) => setShareModalFileId(file.id)}
            onUpdateTags={handleUpdateTags}
            currentPath={currentPath}
            onBreadcrumbClick={handleBreadcrumbClick}
          />
        )}
      </div>

      {/* OVERLAYS & PORTALS */}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={files.find((f) => f.id === contextMenu.fileId)!}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Share Modal */}
      {fileToShare && (
        <ShareModal
          file={fileToShare}
          onClose={() => setShareModalFileId(null)}
          onAddToast={addToast}
        />
      )}

      {/* Upload Progress Drawer */}
      <UploadDrawer
        queue={uploadQueue}
        onClose={() => setIsUploadDrawerOpen(false)}
        isOpen={isUploadDrawerOpen}
      />

      {/* Toast Alert stack */}
      <ToastContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
      />
    </div>
  );
}

