import { useEffect, useRef } from 'react';
import { Eye, Download, Share2, Edit2, Copy, Move, Star, Trash2, FolderOpen, RefreshCw } from 'lucide-react';
import { FileItem } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  file: FileItem;
  onClose: () => void;
  onAction: (action: string, file: FileItem) => void;
}

export default function ContextMenu({
  x,
  y,
  file,
  onClose,
  onAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('contextmenu', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, [onClose]);

  // Adjust coordinates to prevent rendering outside viewport
  const menuWidth = 210;
  const menuHeight = 330;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const adjustedX = x + menuWidth > screenWidth ? screenWidth - menuWidth - 8 : x;
  const adjustedY = y + menuHeight > screenHeight ? screenHeight - menuHeight - 8 : y;

  const isFolder = file.type === 'folder';

  const menuItems = [
    {
      id: 'preview',
      label: isFolder ? 'Open Folder' : 'Preview',
      icon: isFolder ? FolderOpen : Eye,
      shortcut: '',
    },
    {
      id: 'download',
      label: 'Download',
      icon: Download,
      shortcut: '⌘D',
    },
    {
      id: 'share',
      label: 'Share link',
      icon: Share2,
      shortcut: '⌘S',
    },
    { type: 'separator' },
    {
      id: 'rename',
      label: 'Rename',
      icon: Edit2,
      shortcut: '',
    },
    {
      id: 'copy',
      label: 'Copy to...',
      icon: Copy,
      shortcut: '',
    },
    {
      id: 'move',
      label: 'Move to...',
      icon: Move,
      shortcut: '',
    },
    { type: 'separator' },
    {
      id: 'star',
      label: file.isStarred ? 'Remove Starred' : 'Add to Starred',
      icon: Star,
      shortcut: '',
      active: file.isStarred,
    },
    { type: 'separator' },
    {
      id: 'trash',
      label: file.isTrash ? 'Restore Item' : 'Move to Trash',
      icon: file.isTrash ? RefreshCw : Trash2,
      shortcut: 'Del',
      danger: !file.isTrash,
      success: file.isTrash,
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
      className="w-[210px] bg-overlay border border-border-default rounded-xl p-1 shadow-2xl backdrop-blur-md z-[1000] select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {menuItems.map((item, idx) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={`sep-${idx}`} className="h-[1px] bg-border-subtle my-1 mx-1" />;
        }

        const MenuItem = item as {
          id: string;
          label: string;
          icon: any;
          shortcut: string;
          danger?: boolean;
          success?: boolean;
          active?: boolean;
        };

        const Icon = MenuItem.icon;

        return (
          <button
            key={MenuItem.id}
            onClick={() => {
              onAction(MenuItem.id, file);
              onClose();
            }}
            className={`w-full h-[32px] px-2.5 rounded-lg flex items-center justify-between text-xs text-left cursor-pointer transition-colors ${
              MenuItem.danger
                ? 'text-danger hover:bg-danger/10'
                : MenuItem.success
                ? 'text-success hover:bg-success/10'
                : MenuItem.active
                ? 'text-accent-text hover:bg-border-subtle'
                : 'text-text-primary hover:bg-border-subtle hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon size={14} className={MenuItem.active ? 'text-accent' : 'opacity-70'} />
              <span className="font-sans font-medium">{MenuItem.label}</span>
            </div>
            {MenuItem.shortcut && (
              <span className="font-mono text-[10px] text-text-muted select-none">
                {MenuItem.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
