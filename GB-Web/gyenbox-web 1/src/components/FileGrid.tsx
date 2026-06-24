import React from 'react';
import { 
  Folder, Image, FileText, FileSpreadsheet, Video, FolderArchive, File, 
  MoreVertical, Star, Trash2, Eye, Share2, Download, RefreshCw 
} from 'lucide-react';
import { FileItem, FileType } from '../types';

interface FileGridProps {
  files: FileItem[];
  selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (file: FileItem) => void;
  onFileContextMenu: (e: React.MouseEvent, file: FileItem) => void;
  viewMode: 'grid' | 'list';
  activeTab: string;
}

export function getFileColor(type: FileType): string {
  switch (type) {
    case 'folder': return '#F0A500';
    case 'png': return '#FF6B9D';
    case 'pdf': return '#E8445A';
    case 'docx': return '#3B9EFF';
    case 'xlsx': return '#1DB877';
    case 'mp4': return '#7C6AF7';
    case 'zip': return '#8A8AA8';
    case 'txt': return '#F0A500';
    default: return '#8A8AA8';
  }
}

export function FileIcon({ type, size = 36 }: { type: FileType; size?: number }) {
  const color = getFileColor(type);
  switch (type) {
    case 'folder':
      return <Folder size={size} color={color} fill={color} fillOpacity={0.15} />;
    case 'png':
      return <Image size={size} color={color} />;
    case 'pdf':
      return <FileText size={size} color={color} />;
    case 'docx':
      return <FileText size={size} color={color} />;
    case 'xlsx':
      return <FileSpreadsheet size={size} color={color} />;
    case 'mp4':
      return <Video size={size} color={color} />;
    case 'zip':
      return <FolderArchive size={size} color={color} />;
    case 'txt':
      return <File size={size} color={color} />;
    default:
      return <File size={size} color={color} />;
  }
}

export default function FileGrid({
  files,
  selectedIds,
  onSelect,
  onDoubleClick,
  onFileContextMenu,
  viewMode,
  activeTab,
}: FileGridProps) {
  // Filter folders and files
  const folders = files.filter(f => f.type === 'folder');
  const otherFiles = files.filter(f => f.type !== 'folder');

  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelect(id, e);
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none">
        <Folder size={48} className="text-text-muted mb-4 opacity-40 animate-pulse" />
        <h3 className="text-sm font-semibold text-text-primary mb-1">No items found</h3>
        <p className="text-xs text-text-secondary max-w-xs">
          {activeTab === 'trash' 
            ? 'Your trash is completely empty.' 
            : activeTab === 'starred'
            ? 'Star files to keep track of important items.'
            : 'This folder is empty. Drag & drop or click Upload to add files.'}
        </p>
      </div>
    );
  }

  // --- GRID VIEW ---
  if (viewMode === 'grid') {
    return (
      <div className="flex flex-col gap-6 select-none pb-12">
        {/* FOLDERS SECTION */}
        {folders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
                Folders ({folders.length})
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
              {folders.map((folder) => {
                const isSelected = selectedIds.has(folder.id);
                return (
                  <div
                    key={folder.id}
                    id={`file-card-${folder.id}`}
                    onClick={(e) => onSelect(folder.id, e)}
                    onDoubleClick={() => onDoubleClick(folder)}
                    onContextMenu={(e) => onFileContextMenu(e, folder)}
                    className={`group relative bg-card-bg border rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-accent bg-[rgba(124,106,247,0.08)]'
                        : 'border-border-subtle hover:border-border-default hover:bg-card-hover -translate-y-[1px]'
                    }`}
                  >
                    {/* Checkbox (top-left, visible on hover or when selected) */}
                    <div
                      onClick={(e) => handleCheckboxClick(e, folder.id)}
                      className={`absolute top-2 left-2 z-10 w-4 h-4 border rounded flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-accent border-accent text-white scale-100'
                          : 'border-border-strong bg-overlay opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Star status indicator */}
                    {folder.isStarred && (
                      <div className="absolute top-2 right-2.5 z-10 text-warning">
                        <Star size={11} fill="#F0A500" />
                      </div>
                    )}

                    {/* THUMBNAIL AREA */}
                    <div className="h-[90px] flex items-center justify-center relative">
                      <FileIcon type="folder" size={36} />
                    </div>

                    {/* CARD BODY */}
                    <div className="p-2.5 border-t border-border-subtle/50 bg-surface/20">
                      <div className="font-sans font-medium text-[13px] text-text-primary truncate" title={folder.name}>
                        {folder.name}
                      </div>
                      <div className="font-mono text-[10px] text-text-secondary mt-0.5">
                        {folder.itemCount ?? 0} items
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FILES SECTION */}
        {otherFiles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3.5 mt-2">
              <span className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
                Recent Files ({otherFiles.length})
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
              {otherFiles.map((file) => {
                const isSelected = selectedIds.has(file.id);
                const color = getFileColor(file.type);
                return (
                  <div
                    key={file.id}
                    id={`file-card-${file.id}`}
                    onClick={(e) => onSelect(file.id, e)}
                    onDoubleClick={() => onDoubleClick(file)}
                    onContextMenu={(e) => onFileContextMenu(e, file)}
                    className={`group relative bg-card-bg border rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-accent bg-[rgba(124,106,247,0.08)]'
                        : 'border-border-subtle hover:border-border-default hover:bg-card-hover -translate-y-[1px]'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={(e) => handleCheckboxClick(e, file.id)}
                      className={`absolute top-2 left-2 z-10 w-4 h-4 border rounded flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-accent border-accent text-white scale-100'
                          : 'border-border-strong bg-overlay opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Star status */}
                    {file.isStarred && (
                      <div className="absolute top-2 right-10 z-10 text-warning">
                        <Star size={11} fill="#F0A500" />
                      </div>
                    )}

                    {/* Type Badge */}
                    {file.badge && (
                      <div 
                        className="absolute top-2 right-2 z-10 bg-page-bg/85 border border-border-subtle rounded px-1.5 py-0.5 font-mono text-[9px] uppercase font-bold"
                        style={{ color }}
                      >
                        {file.badge}
                      </div>
                    )}

                    {/* THUMBNAIL AREA */}
                    <div className="h-[90px] flex items-center justify-center relative">
                      <FileIcon type={file.type} size={36} />
                    </div>

                    {/* CARD BODY */}
                    <div className="p-2.5 border-t border-border-subtle/50 bg-surface/20">
                      <div className="font-sans font-medium text-[13px] text-text-primary truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="font-mono text-[10px] text-text-secondary mt-0.5 flex justify-between">
                        <span>{file.modifiedText}</span>
                        <span>·</span>
                        <span>{file.size}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="w-full overflow-x-auto select-none pb-12">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-border-subtle h-8 text-[11px] font-semibold text-text-muted tracking-wider uppercase">
            <th className="w-10 px-4">
              {/* Checkbox column header spacer */}
            </th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Size</th>
            <th className="px-3 py-2">Modified</th>
            <th className="px-3 py-2">Tags</th>
            <th className="w-12 px-3 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const isSelected = selectedIds.has(file.id);
            const color = getFileColor(file.type);
            return (
              <tr
                key={file.id}
                id={`file-row-${file.id}`}
                onClick={(e) => onSelect(file.id, e)}
                onDoubleClick={() => onDoubleClick(file)}
                onContextMenu={(e) => onFileContextMenu(e, file)}
                className={`group border-b border-border-subtle/50 h-11 items-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[rgba(124,106,247,0.06)] hover:bg-[rgba(124,106,247,0.08)]'
                    : 'hover:bg-card-hover'
                }`}
              >
                {/* CHECKBOX */}
                <td className="px-4 text-center">
                  <div
                    onClick={(e) => handleCheckboxClick(e, file.id)}
                    className={`w-4 h-4 border rounded flex items-center justify-center mx-auto transition-all ${
                      isSelected
                        ? 'bg-accent border-accent text-white scale-100'
                        : 'border-border-strong bg-overlay opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </td>

                {/* NAME */}
                <td className="px-3 py-1">
                  <div className="flex items-center gap-2.5">
                    <FileIcon type={file.type} size={20} />
                    <span className="font-sans font-medium text-xs text-text-primary truncate max-w-sm" title={file.name}>
                      {file.name}
                    </span>
                    {file.isStarred && (
                      <Star size={11} fill="#F0A500" className="text-warning shrink-0" />
                    )}
                    {file.badge && (
                      <span 
                        className="bg-page-bg border border-border-subtle px-1 rounded font-mono text-[8px] font-bold"
                        style={{ color }}
                      >
                        {file.badge}
                      </span>
                    )}
                  </div>
                </td>

                {/* SIZE */}
                <td className="px-3 py-1 font-mono text-[11px] text-text-secondary">
                  {file.type === 'folder' ? '—' : file.size}
                </td>

                {/* MODIFIED */}
                <td className="px-3 py-1 font-mono text-[11px] text-text-secondary">
                  {file.modifiedText}
                </td>

                {/* TAGS */}
                <td className="px-3 py-1">
                  <div className="flex items-center gap-1 overflow-hidden max-w-xs whitespace-nowrap">
                    {file.tags && file.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] bg-border-subtle text-text-secondary px-1.5 py-0.5 rounded-full border border-border-default">
                        {tag}
                      </span>
                    ))}
                    {file.tags && file.tags.length > 2 && (
                      <span className="text-[9px] text-text-muted">
                        +{file.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>

                {/* MORE ACTIONS */}
                <td className="px-3 py-1 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileContextMenu(e, file);
                    }}
                    className="p-1 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <MoreVertical size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
