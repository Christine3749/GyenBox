import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, FileText, Download, Share2, Plus, MessageSquare, Send } from 'lucide-react';
import { FileItem, ActivityItem, CommentItem } from '../types';
import { FILE_TYPE_CONFIG } from './FileCard';

interface DetailPanelProps {
  file: FileItem;
  onClose: () => void;
  activities: ActivityItem[];
  comments: CommentItem[];
  onAddComment: (fileId: string, commentText: string) => void;
  onDownload: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onNavigateToFolder: (folderId: string | null) => void;
}

type TabType = 'details' | 'activity' | 'comments';

export default function DetailPanel({
  file,
  onClose,
  activities,
  comments,
  onAddComment,
  onDownload,
  onShare,
  onNavigateToFolder
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [newComment, setNewComment] = useState('');
  const [tags, setTags] = useState<string[]>(['design', 'brand']);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');

  const config = FILE_TYPE_CONFIG[file.type] || { icon: FileText, color: '#8A8AA8', label: 'FILE' };
  const Icon = config.icon;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(file.id, newComment.trim());
    setNewComment('');
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagInputValue.trim() && !tags.includes(tagInputValue.trim().toLowerCase())) {
      setTags([...tags, tagInputValue.trim().toLowerCase()]);
      setTagInputValue('');
      setShowTagInput(false);
    }
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-full bg-[#0F0F1A] border-l border-[#1E1E2E] flex flex-col flex-shrink-0 overflow-hidden select-none z-40"
      id="detail-panel"
    >
      {/* HEADER */}
      <div className="px-4 h-14 border-b border-[#1E1E2E] flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-[14px] font-semibold text-[#EEEEF8] truncate" title={file.name}>
            {file.name}
          </h3>
          <span 
            className="inline-block mt-0.5 text-[9px] font-mono font-bold uppercase rounded px-1.5 py-0.5 bg-[#13131F] border border-[#1E1E2E]"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[#1E1E2E] text-[#8A8AA8] hover:text-[#EEEEF8] flex items-center justify-center cursor-pointer transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* PREVIEW AREA (160px height) */}
      <div className="h-[160px] bg-[#13131F] border-b border-[#1E1E2E] flex items-center justify-center relative">
        <div style={{ color: config.color }}>
          <Icon className="w-16 h-16 fill-current opacity-90 drop-shadow-lg" />
        </div>
      </div>

      {/* TABS CONTAINER */}
      <div className="flex border-b border-[#1E1E2E] px-2 text-[12px] font-medium" id="details-tabs">
        {(['details', 'activity', 'comments'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center capitalize cursor-pointer transition-colors relative ${
              activeTab === tab 
                ? 'text-[#EEEEF8] font-semibold' 
                : 'text-[#4A4A6A] hover:text-[#8A8AA8]'
            }`}
          >
            <span>{tab}</span>
            {activeTab === tab && (
              <motion.div 
                layoutId="activeDetailTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C6AF7]"
              />
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT PANEL */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col" id="details-tab-content">
        
        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#4A4A6A]">Type:</span>
                <span className="text-[#EEEEF8] font-medium">{file.type === 'folder' ? 'Folder' : `${config.label} File`}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#4A4A6A]">Size:</span>
                <span className="text-[#EEEEF8] font-mono font-medium">{file.type === 'folder' ? `${file.itemCount} items` : file.size}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#4A4A6A]">Modified:</span>
                <span className="text-[#EEEEF8] font-mono font-medium">{file.modifiedAt}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#4A4A6A]">Created:</span>
                <span className="text-[#EEEEF8] font-mono font-medium">{file.createdAt}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#4A4A6A]">Owner:</span>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#7C6AF7] text-white flex items-center justify-center text-[9px] font-semibold">
                    {file.owner.avatar}
                  </span>
                  <span className="text-[#EEEEF8] font-medium">{file.owner.name}</span>
                </div>
              </div>
            </div>

            {/* LOCATION */}
            <div className="pt-3 border-t border-[#1E1E2E]/60">
              <div className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase mb-1.5">
                Location
              </div>
              <div className="text-[12px] font-medium text-[#A99FF8]">
                <span 
                  className="hover:underline cursor-pointer"
                  onClick={() => onNavigateToFolder(null)}
                >
                  My Files
                </span>
                {file.parentFolderId && (
                  <>
                    <span className="text-[#4A4A6A] mx-1">›</span>
                    <span 
                      className="hover:underline cursor-pointer"
                      onClick={() => onNavigateToFolder(file.parentFolderId)}
                    >
                      Parent Folder
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* TAGS */}
            <div className="pt-3 border-t border-[#1E1E2E]/60">
              <div className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase mb-2">
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="px-2 py-0.5 bg-[#1F1F2E] border border-[#2A2A3D] text-[#8A8AA8] rounded text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
                
                {showTagInput ? (
                  <form onSubmit={handleAddTag} className="inline-flex">
                    <input
                      type="text"
                      autoFocus
                      required
                      value={tagInputValue}
                      onChange={(e) => setTagInputValue(e.target.value)}
                      onBlur={() => setShowTagInput(false)}
                      placeholder="tag name..."
                      className="w-18 px-1.5 h-5 bg-[#13131F] border border-[#7C6AF7] rounded text-[11px] text-[#EEEEF8] outline-none"
                    />
                  </form>
                ) : (
                  <button 
                    onClick={() => setShowTagInput(true)}
                    className="px-2 py-0.5 border border-dashed border-[#2A2A3D] text-[#4A4A6A] hover:text-[#EEEEF8] hover:border-[#7C6AF7] rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Add tag</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-3.5 pr-1">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-[#4A4A6A] text-[12px]">
                No recent activity for this item.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex gap-2 text-[12px] leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] mt-1.5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <p className="text-[#EEEEF8]">
                      <span className="font-semibold">{act.user}</span>{' '}
                      <span className="text-[#8A8AA8]">{act.action}</span>
                    </p>
                    <span className="text-[10px] font-mono text-[#4A4A6A] mt-0.5">{act.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMMENTS TAB */}
        {activeTab === 'comments' && (
          <div className="flex flex-col h-full space-y-4">
            {/* COMMENTS LIST */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-[#4A4A6A] text-[12px] flex flex-col items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#2A2A3D]" />
                  <span>No comments yet.</span>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 text-[12px] leading-normal" id={`comment-${comment.id}`}>
                    <span className="w-6 h-6 rounded-full bg-[#7C6AF7] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {comment.avatar}
                    </span>
                    <div className="flex flex-col bg-[#13131F] border border-[#1E1E2E] rounded-lg p-2.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#EEEEF8]">{comment.user}</span>
                        <span className="font-mono text-[9px] text-[#4A4A6A]">{comment.time}</span>
                      </div>
                      <p className="text-[#8A8AA8] break-words">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ADD COMMENT FORM */}
            <form onSubmit={handleCommentSubmit} className="flex gap-1.5 border-t border-[#1E1E2E] pt-3 mt-auto">
              <input
                type="text"
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 h-8 bg-[#13131F] border border-[#2A2A3D] rounded-lg px-2.5 text-[12px] text-[#EEEEF8] placeholder-[#4A4A6A] focus:outline-none focus:border-[#7C6AF7]"
              />
              <button
                type="submit"
                className="w-8 h-8 bg-[#7C6AF7] hover:bg-[#5B4FD4] text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                title="Send comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="p-4 bg-[#13131F]/40 border-t border-[#1E1E2E] flex gap-2" id="details-footer">
        <button
          onClick={() => onDownload(file)}
          className="flex-1 h-8.5 border border-[#2A2A3D] hover:bg-[#171724] hover:text-[#EEEEF8] text-[#8A8AA8] text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>
        <button
          onClick={() => onShare(file)}
          className="flex-1 h-8.5 bg-[#7C6AF7] hover:bg-[#5B4FD4] text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </motion.aside>
  );
}
