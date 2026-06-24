import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Tag, Plus, MessageSquare, Activity as ActivityIcon, Info } from 'lucide-react';
import { FileItem } from '../types';
import { FileIcon, getFileColor } from './FileGrid';

interface DetailPanelProps {
  file: FileItem;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onUpdateTags: (fileId: string, tags: string[]) => void;
  currentPath: { id: string | null; name: string }[];
  onBreadcrumbClick: (id: string | null) => void;
}

interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

interface ActivityLog {
  id: string;
  author: string;
  avatar: string;
  action: string;
  time: string;
}

export default function DetailPanel({
  file,
  onClose,
  onDownload,
  onShare,
  onUpdateTags,
  currentPath,
  onBreadcrumbClick,
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('details');
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // Persistent comments/activities per file stored in simple state mapped by fileId
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({
    'file-brand-logo': [
      { id: '1', author: 'Ethan Li', avatar: 'EL', text: "Let's review this brand logo version today.", time: '2 hours ago' },
      { id: '2', author: 'Sophia Chen', avatar: 'SC', text: 'Looks very clean. The negative space is perfect!', time: '1 hour ago' },
    ],
    'file-contract-v4': [
      { id: '1', author: 'Sophia Chen', avatar: 'SC', text: 'Sent to legal for a final signature check.', time: 'Yesterday' }
    ]
  });

  const [activitiesMap] = useState<Record<string, ActivityLog[]>>({
    'file-brand-logo': [
      { id: '1', author: 'Ethan Li', avatar: 'EL', action: 'uploaded this file', time: '2 hours ago' },
      { id: '2', author: 'Sophia Chen', avatar: 'SC', action: 'viewed the file', time: '1 hour ago' },
      { id: '3', author: 'Ethan Li', avatar: 'EL', action: 'added tag "brand"', time: '30 mins ago' },
    ],
    'file-contract-v4': [
      { id: '1', author: 'Sophia Chen', avatar: 'SC', action: 'created the draft', time: '2 days ago' },
      { id: '2', author: 'Sophia Chen', avatar: 'SC', action: 'uploaded version 4', time: 'Yesterday' },
    ]
  });

  const fileComments = commentsMap[file.id] || [
    { id: 'default-1', author: 'Ethan Li', avatar: 'EL', text: 'No comments yet. Be the first to start the conversation!', time: 'Just now' }
  ];

  const fileActivities = activitiesMap[file.id] || [
    { id: 'default-1', author: file.ownerName || 'Ethan Li', avatar: file.ownerAvatar || 'EL', action: 'created this item', time: file.modifiedText || 'Just now' }
  ];

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    const currentTags = file.tags || [];
    if (!currentTags.includes(tag)) {
      onUpdateTags(file.id, [...currentTags, tag]);
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = file.tags || [];
    onUpdateTags(file.id, currentTags.filter(t => t !== tagToRemove));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: Math.random().toString(),
      author: 'Ethan Li',
      avatar: 'EL',
      text: commentText.trim(),
      time: 'Just now'
    };

    setCommentsMap(prev => ({
      ...prev,
      [file.id]: [...(prev[file.id] || []), newComment]
    }));
    setCommentText('');
  };

  const color = getFileColor(file.type);

  return (
    <aside className="w-80 h-full bg-surface border-l border-border-subtle flex flex-col shrink-0 overflow-hidden relative select-none">
      {/* HEADER */}
      <div className="h-14 px-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex flex-col min-w-0 max-w-[220px]">
          <span className="font-sans font-semibold text-sm text-text-primary truncate" title={file.name}>
            {file.name}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider font-mono mt-0.5" style={{ color }}>
            {file.type === 'folder' ? 'Folder' : `${file.type} file`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* PREVIEW AREA */}
      <div className="h-40 bg-card-bg/60 flex flex-col items-center justify-center relative border-b border-border-subtle/50">
        <FileIcon type={file.type} size={56} />
        {file.badge && (
          <span 
            className="absolute top-3 right-3 bg-page-bg/90 border border-border-subtle rounded-md px-2 py-0.5 font-mono text-[10px] uppercase font-bold"
            style={{ color }}
          >
            {file.badge}
          </span>
        )}
      </div>

      {/* TABS CONTROLLER */}
      <div className="flex border-b border-border-subtle bg-surface/80 h-9">
        {(['details', 'activity', 'comments'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 h-full flex items-center justify-center text-xs font-semibold capitalize transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'border-accent text-text-primary bg-page-bg/10'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab === 'comments' && <MessageSquare size={12} className="mr-1.5" />}
              {tab === 'activity' && <ActivityIcon size={12} className="mr-1.5" />}
              {tab === 'details' && <Info size={12} className="mr-1.5" />}
              <span>{tab}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {activeTab === 'details' && (
          <>
            {/* Metadata fields */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Information
              </span>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                  <span className="text-text-secondary">Type</span>
                  <span className="text-text-primary font-medium uppercase">{file.type}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                  <span className="text-text-secondary">Size</span>
                  <span className="text-text-primary font-mono">{file.type === 'folder' ? file.size || '—' : file.size}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                  <span className="text-text-secondary">Modified</span>
                  <span className="text-text-primary font-mono">{file.modifiedText}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                  <span className="text-text-secondary">Created</span>
                  <span className="text-text-primary font-mono">{file.createdDate}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-text-secondary">Owner</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center select-none">
                      {file.ownerAvatar || 'EL'}
                    </span>
                    <span className="text-text-primary font-medium">{file.ownerName || 'Ethan Li'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location breadcrumb path */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Location
              </span>
              <div className="text-xs text-accent-text hover:text-accent font-medium cursor-pointer transition-colors">
                <span onClick={() => onBreadcrumbClick(null)}>My Files</span>
                {file.parentId && (
                  <>
                    <span className="text-text-muted mx-1">›</span>
                    <span onClick={() => onBreadcrumbClick(file.parentId)} className="underline">
                      Active Folder
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Tags section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Tag size={10} />
                  <span>Tags</span>
                </span>
                {!isAddingTag && (
                  <button
                    onClick={() => setIsAddingTag(true)}
                    className="text-[10px] font-bold text-accent-text hover:text-accent flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={10} />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {/* Tag pills */}
              <div className="flex flex-wrap gap-1.5">
                {file.tags && file.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="group/tag inline-flex items-center gap-1 text-[10px] bg-border-subtle text-text-secondary px-2 py-0.5 rounded-full border border-border-default hover:text-text-primary transition-colors"
                  >
                    <span>{tag}</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-text-muted hover:text-danger font-bold text-[9px] w-3 h-3 flex items-center justify-center rounded-full hover:bg-border-strong cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {(!file.tags || file.tags.length === 0) && (
                  <span className="text-xs text-text-muted italic">No tags associated</span>
                )}
              </div>

              {/* Input for adding new tag */}
              {isAddingTag && (
                <form onSubmit={handleAddTagSubmit} className="flex gap-1.5 mt-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="New tag..."
                    className="h-7 px-2 flex-1 bg-card-bg border border-border-default rounded-md text-xs text-text-primary focus:outline-none focus:border-accent"
                    maxLength={15}
                    autoFocus
                  />
                  <button 
                    type="submit"
                    className="h-7 px-2.5 bg-accent hover:bg-accent-dim rounded-md text-[10px] font-bold text-white cursor-pointer"
                  >
                    Add
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingTag(false)}
                    className="h-7 w-7 flex items-center justify-center border border-border-default rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover cursor-pointer"
                  >
                    ✕
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              File Logs
            </span>
            {fileActivities.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-border-strong text-[9px] text-text-secondary flex items-center justify-center shrink-0 font-bold select-none">
                  {log.avatar}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium leading-tight">
                    {log.author} <span className="text-text-secondary font-normal">{log.action}</span>
                  </p>
                  <span className="text-[10px] text-text-muted font-mono">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COMMENTS TAB */}
        {activeTab === 'comments' && (
          <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto mb-2 pr-1">
              {fileComments.map((com) => (
                <div key={com.id} className="flex items-start gap-2.5 text-xs border-b border-border-subtle/25 pb-2.5">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent-text border border-accent/20 text-[9px] flex items-center justify-center shrink-0 font-bold select-none">
                    {com.avatar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-text-primary font-medium">{com.author}</span>
                      <span className="text-[9px] text-text-muted font-mono">{com.time}</span>
                    </div>
                    <p className="text-text-secondary leading-normal">{com.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-1.5 mt-auto">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="h-8 px-2.5 flex-1 bg-card-bg border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="h-8 px-3 bg-accent hover:bg-accent-dim rounded-lg text-xs font-semibold text-white cursor-pointer"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="h-16 border-t border-border-subtle p-3 bg-surface/95 flex gap-2">
        <button
          onClick={() => onDownload(file)}
          className="flex-1 h-10 border border-border-default hover:bg-card-hover text-text-primary rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Download size={14} className="text-text-secondary" />
          <span>Download</span>
        </button>
        <button
          onClick={() => onShare(file)}
          className="flex-1 h-10 bg-accent hover:bg-accent-dim text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      </div>
    </aside>
  );
}
