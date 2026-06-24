import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Folder, FileText, Download } from 'lucide-react';

import { FileItem, UploadingFile, ToastItem, ActivityItem, CommentItem, SortField, SortOrder } from './types';
import { INITIAL_FILES, INITIAL_ACTIVITIES, INITIAL_COMMENTS } from './initialData';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toolbar from './components/Toolbar';
import FileCard from './components/FileCard';
import ContextMenu from './components/ContextMenu';
import ShareModal from './components/ShareModal';
import UploadDrawer from './components/UploadDrawer';
import DetailPanel from './components/DetailPanel';
import ToastStack from './components/ToastStack';
import DragOverlay from './components/DragOverlay';

export default function App() {
  // --- CORE STATE ---
  const [files, setFiles] = useState<FileItem[]>(() => {
    // Try to load from localStorage, otherwise default
    const saved = localStorage.getItem('gyenbox_files');
    return saved ? JSON.parse(saved) : INITIAL_FILES;
  });

  const [activeTab, setActiveTab] = useState<string>('files');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [sortField, setSortField] = useState<SortField>('modified');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Overlays
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Notifications, Activities, Comments
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const saved = localStorage.getItem('gyenbox_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });
  const [comments, setComments] = useState<Record<string, CommentItem[]>>(() => {
    const saved = localStorage.getItem('gyenbox_comments');
    return saved ? JSON.parse(saved) : INITIAL_COMMENTS;
  });

  // Track drag leave counter to prevent flickering
  const dragCounter = useRef(0);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('gyenbox_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('gyenbox_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('gyenbox_comments', JSON.stringify(comments));
  }, [comments]);

  // --- HELPER TO ADD TOASTS ---
  const addToast = (title: string, body: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const newToast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      body,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- WELCOME TOAST ---
  useEffect(() => {
    const timer = setTimeout(() => {
      addToast('Welcome to Gyenbox', 'Your territory is ready.', 'info');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // --- NAVIGATION HELPERS ---
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return files.find((f) => f.id === currentFolderId && f.type === 'folder') || null;
  }, [files, currentFolderId]);

  const handleNavigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
    // Auto-set sidebar tab to My Files when inside folders
    if (folderId !== null) {
      setActiveTab('files');
    }
  };

  // --- SELECTION / SELECTED FILE DETECTOR ---
  const selectedFile = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const firstId = Array.from(selectedIds)[0];
    return files.find((f) => f.id === firstId) || null;
  }, [selectedIds, files]);

  // --- FILTERED & SORTED FILES ---
  const processedFiles = useMemo(() => {
    // 1. FILTERING BY SIDEBAR TAB
    let filtered = files;

    if (activeTab === 'trash') {
      filtered = files.filter((f) => f.isTrash);
    } else {
      // Exclude trashed items for other views
      filtered = files.filter((f) => !f.isTrash);

      if (activeTab === 'files') {
        filtered = filtered.filter((f) => f.parentFolderId === currentFolderId);
      } else if (activeTab === 'starred') {
        filtered = filtered.filter((f) => f.starred);
      } else if (activeTab === 'shared') {
        filtered = filtered.filter((f) => f.shared);
      } else if (activeTab === 'recent') {
        // Just show all files, sorted by newest later
        filtered = filtered.filter((f) => f.type !== 'folder');
      } else if (activeTab === 'home') {
        // Home shows root-level directories & files
        filtered = filtered.filter((f) => f.parentFolderId === null);
      } else if (activeTab === 'docs') {
        filtered = filtered.filter((f) => f.type === 'docx' || f.type === 'txt');
      }
    }

    // 2. SEARCH FILTERING
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((f) => f.name.toLowerCase().includes(q));
    }

    // 3. SORTING MAP (helper to order relative dates)
    const dateWeights: Record<string, number> = {
      '2h ago': 1,
      'Yesterday': 2,
      'Monday': 3,
      '3d ago': 4,
      '5d ago': 5,
      'Last week': 6,
      'Sep 28': 7,
    };

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'size') {
        comparison = (a.sizeBytes || 0) - (b.sizeBytes || 0);
      } else if (sortField === 'modified') {
        const weightA = dateWeights[a.modifiedAt] || 99;
        const weightB = dateWeights[b.modifiedAt] || 99;
        comparison = weightA - weightB; // smaller weight is newer
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [files, activeTab, currentFolderId, searchQuery, sortField, sortOrder]);

  // Separate Folders and Files for Home/Files layouts if requested
  const displayFolders = useMemo(() => {
    return processedFiles.filter((f) => f.type === 'folder');
  }, [processedFiles]);

  const displayFiles = useMemo(() => {
    return processedFiles.filter((f) => f.type !== 'folder');
  }, [processedFiles]);

  // --- ACTIONS ---
  const handleSelectFile = (file: FileItem, isMultiSelect: boolean, isCheckboxClick?: boolean) => {
    const newSelected = new Set(selectedIds);
    if (isMultiSelect) {
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
    } else {
      if (newSelected.has(file.id) && newSelected.size === 1 && !isCheckboxClick) {
        // Deselect if clicking the already selected single card
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add(file.id);
      }
    }
    setSelectedIds(newSelected);
  };

  const handleToggleStar = (file: FileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, starred: !f.starred } : f))
    );
    addToast(
      file.starred ? 'Removed from Starred' : 'Added to Starred',
      `"${file.name}" updated successfully.`,
      'success'
    );
  };

  const handleRenameFile = (file: FileItem) => {
    const newName = prompt('Rename file:', file.name);
    if (!newName || !newName.trim()) return;

    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, name: newName.trim() } : f))
    );

    // Add activity
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      user: 'Ethan Li',
      action: `renamed ${file.name} to ${newName.trim()}`,
      time: 'Just now',
    };
    setActivities((prev) => [newActivity, ...prev]);

    addToast('File renamed', `Successfully renamed to "${newName.trim()}".`, 'success');
  };

  const handleCopyTo = (file: FileItem) => {
    addToast('Copied to Clipboard', `"${file.name}" copied successfully. Ready to paste.`, 'success');
  };

  const handleMoveTo = (file: FileItem) => {
    addToast('Move Dialog', `Choose a destination folder to move "${file.name}".`, 'info');
  };

  const handleMoveToTrash = (file: FileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, isTrash: true } : f))
    );
    setSelectedIds(new Set());

    // Add activity
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      user: 'Ethan Li',
      action: `moved ${file.name} to Trash`,
      time: 'Just now',
    };
    setActivities((prev) => [newActivity, ...prev]);

    addToast('Moved to Trash', `"${file.name}" was sent to the trash.`, 'warning');
  };

  const handleCreateFolder = () => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;

    const newFolder: FileItem = {
      id: `folder-${Date.now()}`,
      name: folderName.trim(),
      type: 'folder',
      itemCount: 0,
      size: '0 KB',
      sizeBytes: 0,
      modifiedAt: '2h ago',
      createdAt: 'Jun 24, 2025',
      starred: false,
      shared: false,
      parentFolderId: currentFolderId,
      isTrash: false,
      owner: { name: 'Ethan Li', avatar: 'EL', email: 'Ethan7586@gsyen.com' },
    };

    setFiles((prev) => [newFolder, ...prev]);
    addToast('Folder created', `"${folderName.trim()}" created inside standard workspace.`, 'success');
  };

  // --- COMMENTS ENGINES ---
  const handleAddComment = (fileId: string, text: string) => {
    const newComment: CommentItem = {
      id: `comm-${Date.now()}`,
      user: 'Ethan Li',
      avatar: 'EL',
      text,
      time: 'Just now',
    };

    setComments((prev) => ({
      ...prev,
      [fileId]: [...(prev[fileId] || []), newComment],
    }));

    // Add activity
    const file = files.find((f) => f.id === fileId);
    if (file) {
      const newActivity: ActivityItem = {
        id: `act-${Date.now()}`,
        user: 'Ethan Li',
        action: `commented on ${file.name}`,
        time: 'Just now',
      };
      setActivities((prev) => [newActivity, ...prev]);
    }
  };

  // --- SIMULATED FILE DOWNLOAD ---
  const handleDownloadFile = (file: FileItem) => {
    addToast('Download started', `Preparing download for "${file.name}"...`, 'info');
    setTimeout(() => {
      addToast('Download complete', `"${file.name}" saved to downloads.`, 'success');
    }, 1200);
  };

  // --- MOCK SIMULATED UPLOADING ENGINE ---
  const handleTriggerUpload = () => {
    if (uploadingFiles.length > 0) {
      addToast('Upload in progress', 'Please wait for current uploads to finish.', 'warning');
      return;
    }

    setUploadDrawerOpen(true);
    addToast('Uploading files', 'Transferring 3 items to Gyenbox...', 'info');

    // Create 3 simulated files from prompt spec:
    // Row 1: Brand_Logo.png (starts at 68% for realism)
    // Row 2: Notes.docx (starts at 100% for realism)
    // Row 3: archive.zip (starts at 23% for realism)
    const items: UploadingFile[] = [
      { id: 'up1', name: 'Brand_Logo_New.png', type: 'png', progress: 68, status: 'uploading' },
      { id: 'up2', name: 'Notes_Shared.docx', type: 'docx', progress: 100, status: 'completed' },
      { id: 'up3', name: 'archive_2026.zip', type: 'zip', progress: 23, status: 'uploading' },
    ];

    setUploadingFiles(items);

    // Animate progress bars towards 100%
    const timer = setInterval(() => {
      setUploadingFiles((prev) => {
        let allDone = true;
        const updated = prev.map((f) => {
          if (f.status === 'uploading') {
            const increment = Math.floor(Math.random() * 15) + 5;
            const nextProgress = Math.min(100, f.progress + increment);
            const status = nextProgress >= 100 ? 'completed' : 'uploading';
            if (status === 'uploading') allDone = false;
            return { ...f, progress: nextProgress, status };
          }
          return f;
        });

        if (allDone) {
          clearInterval(timer);
          // Auto add files to the active grid when finished uploading!
          setTimeout(() => {
            // Convert uploading files to real FileItem and inject
            const newFilesToAdd: FileItem[] = updated
              .filter((uf) => uf.id === 'up1' || uf.id === 'up3') // add the newly uploaded ones (Notes was already completed)
              .map((uf) => ({
                id: `new-${Date.now()}-${uf.id}`,
                name: uf.name,
                type: uf.type,
                size: uf.type === 'zip' ? '4.8 MB' : '1.2 MB',
                sizeBytes: uf.type === 'zip' ? 4800000 : 1200000,
                modifiedAt: '2h ago',
                createdAt: 'Jun 24, 2025',
                starred: false,
                shared: false,
                parentFolderId: currentFolderId,
                isTrash: false,
                owner: { name: 'Ethan Li', avatar: 'EL', email: 'Ethan7586@gsyen.com' },
              }));

            setFiles((existing) => [...newFilesToAdd, ...existing]);
            addToast('Uploads successful', 'All files synced with cloud storage.', 'success');
            setUploadingFiles([]);
            setUploadDrawerOpen(false);
          }, 1000);
        }

        return updated;
      });
    }, 800);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleTriggerUpload();
    }
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes modals/menus
      if (e.key === 'Escape') {
        setContextMenu(null);
        setShareFile(null);
        setSelectedIds(new Set());
      }

      // ⌘D / Ctrl+D to download selected
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        if (selectedFile) {
          e.preventDefault();
          handleDownloadFile(selectedFile);
        }
      }

      // ⌘S / Ctrl+S to share selected
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        if (selectedFile) {
          e.preventDefault();
          setShareFile(selectedFile);
        }
      }

      // Delete/Backspace key moves selected to trash
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent deleting during text inputs!
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable'))) {
          return;
        }

        if (selectedFile && activeTab !== 'trash') {
          e.preventDefault();
          handleMoveToTrash(selectedFile);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, activeTab]);

  // Storage Used calculation (in GB) based on file sizes
  const totalStorageGB = useMemo(() => {
    const bytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    return Math.min(10, Math.max(5.8, bytes / 1000000000));
  }, [files]);

  return (
    <div 
      className="flex flex-col h-screen bg-[#07070E] text-[#EEEEF8] select-none font-sans overflow-hidden" 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. TOPBAR */}
      <Topbar
        currentFolder={currentFolder}
        onNavigateToFolder={handleNavigateToFolder}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onUploadClick={handleTriggerUpload}
        onNotificationClick={() => addToast('System Alerts', 'Ethan, you have 2 new security notifications.', 'info')}
        onAvatarClick={() => addToast('Account details', 'Ethan Li • Ethan7586@gsyen.com • Developer edition quota.', 'info')}
      />

      <div className="flex flex-1 h-[calc(100vh-56px)] overflow-hidden relative">
        
        {/* 2. SIDEBAR */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedIds(new Set());
          }}
          storageUsed={totalStorageGB}
          onUpgradeClick={() => addToast('Gyenbox Upgrade', 'Ethan, you are currently using the Developer premium tier.', 'success')}
        />

        {/* 3. MAIN WORKSPACE */}
        <main 
          className="flex-1 flex flex-col relative overflow-hidden"
          id="main-workspace"
        >
          {/* Dot Grid background overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-40 z-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(124,106,247,0.15) 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* TOOLBAR */}
          <Toolbar
            title={
              activeTab === 'files'
                ? currentFolder
                  ? currentFolder.name
                  : 'My Files'
                : activeTab === 'home'
                ? 'Home'
                : activeTab === 'starred'
                ? 'Starred'
                : activeTab === 'shared'
                ? 'Shared'
                : activeTab === 'recent'
                ? 'Recent'
                : activeTab === 'trash'
                ? 'Trash'
                : activeTab === 'requests'
                ? 'File Requests'
                : activeTab === 'docs'
                ? 'Docs'
                : 'Workspace'
            }
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortField={sortField}
            setSortField={setSortField}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onNewFolderClick={handleCreateFolder}
            showNewFolderBtn={activeTab === 'files' || activeTab === 'home'}
          />

          {/* DRAG OVERLAY */}
          <DragOverlay isDragging={isDragging} />

          {/* FILE AREA CANVAS (scrollable) */}
          <div 
            className={`flex-1 overflow-y-auto px-5 pb-5 pt-6 relative z-10 transition-all duration-200 ${
              isDragging ? 'blur-[2px]' : ''
            }`}
            id="file-canvas-area"
          >
            {processedFiles.length === 0 ? (
              /* Empty state layout */
              <div className="flex flex-col items-center justify-center h-full text-center py-24 select-none">
                <div className="w-12 h-12 rounded-xl bg-[#13131F] border border-[#2A2A3D] flex items-center justify-center text-[#4A4A6A] mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-[14px] font-semibold text-[#EEEEF8]">No files found</h3>
                <p className="text-[12px] text-[#4A4A6A] max-w-[240px] mt-1 leading-normal">
                  No matches inside this folder scope. Try uploading or creating folders.
                </p>
              </div>
            ) : viewMode === 'grid' && activeTab === 'home' ? (
              /* HOME / HYBRID VIEW GRID: Renders folders first then recent files with view all toggle options */
              <div className="space-y-6">
                {/* Folders Section */}
                {displayFolders.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase">
                        Folders
                      </h3>
                      <button 
                        onClick={() => setActiveTab('files')}
                        className="text-[12px] font-medium text-[#A99FF8] hover:text-[#7C6AF7] cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
                      {displayFolders.map((f) => (
                        <FileCard
                          key={f.id}
                          file={f}
                          selected={selectedIds.has(f.id)}
                          viewMode={viewMode}
                          onSelect={handleSelectFile}
                          onDoubleClick={(folder) => handleNavigateToFolder(folder.id)}
                          onContextMenu={(file, e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, file });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Files Section */}
                {displayFiles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase">
                        Recent Files
                      </h3>
                      <button 
                        onClick={() => setActiveTab('recent')}
                        className="text-[12px] font-medium text-[#A99FF8] hover:text-[#7C6AF7] cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
                      {displayFiles.map((file) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          selected={selectedIds.has(file.id)}
                          viewMode={viewMode}
                          onSelect={handleSelectFile}
                          onDoubleClick={() => handleDownloadFile(file)}
                          onContextMenu={(file, e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, file });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* COMPACT UNIFIED FILE GRID / LIST VIEW RENDERER */
              <div 
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5'
                    : 'flex flex-col bg-[#13131F]/30 border border-[#1E1E2E] rounded-xl overflow-hidden'
                }
              >
                {processedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    selected={selectedIds.has(file.id)}
                    viewMode={viewMode}
                    onSelect={handleSelectFile}
                    onDoubleClick={(f) => {
                      if (f.type === 'folder') {
                        handleNavigateToFolder(f.id);
                      } else {
                        handleDownloadFile(f);
                      }
                    }}
                    onContextMenu={(file, e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, file });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* 4. DETAIL PANEL (Slides in dynamically when exactly 1 file is selected) */}
        <AnimatePresence mode="popLayout">
          {selectedFile && (
            <DetailPanel
              file={selectedFile}
              onClose={() => setSelectedIds(new Set())}
              activities={activities}
              comments={comments[selectedFile.id] || []}
              onAddComment={handleAddComment}
              onDownload={handleDownloadFile}
              onShare={(file) => setShareFile(file)}
              onNavigateToFolder={handleNavigateToFolder}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 5. INTERACTION PORTALS / OVERLAYS */}
      
      {/* Context Menu portal */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onPreview={(f) => addToast('Viewer panel', `Previewing "${f.name}".`, 'info')}
          onDownload={handleDownloadFile}
          onShare={(f) => setShareFile(f)}
          onRename={handleRenameFile}
          onCopyTo={handleCopyTo}
          onMoveTo={handleMoveTo}
          onToggleStar={handleToggleStar}
          onMoveToTrash={handleMoveToTrash}
        />
      )}

      {/* Share Modal portal */}
      <ShareModal
        isOpen={!!shareFile}
        file={shareFile}
        onClose={() => setShareFile(null)}
        onInvite={(email, role) => {
          addToast('Invitation sent', `Invited ${email} to collaborate as ${role}.`, 'success');
          if (shareFile) {
            setFiles((prev) =>
              prev.map((f) => (f.id === shareFile.id ? { ...f, shared: true } : f))
            );
          }
        }}
      />

      {/* Upload progress drawer portal */}
      <UploadDrawer
        isOpen={uploadDrawerOpen}
        files={uploadingFiles}
        onClose={() => setUploadDrawerOpen(false)}
      />

      {/* Toast Notification stack */}
      <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

