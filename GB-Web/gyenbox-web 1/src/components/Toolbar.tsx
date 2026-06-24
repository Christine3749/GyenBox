import { useState } from 'react';
import { LayoutGrid, List, Plus, ArrowUpDown, Check } from 'lucide-react';

interface ToolbarProps {
  title: string;
  onNewFolderClick: () => void;
  showNewFolderButton: boolean;
  sortField: 'name' | 'size' | 'modified';
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: 'name' | 'size' | 'modified', order: 'asc' | 'desc') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function Toolbar({
  title,
  onNewFolderClick,
  showNewFolderButton,
  sortField,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
}: ToolbarProps) {
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const sortOptions: { label: string; field: 'name' | 'size' | 'modified' }[] = [
    { label: 'Name', field: 'name' },
    { label: 'Size', field: 'size' },
    { label: 'Last Modified', field: 'modified' },
  ];

  const handleSortSelect = (field: 'name' | 'size' | 'modified') => {
    // If selecting same field, toggle order. Otherwise, default to ascending
    if (sortField === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
    setIsSortDropdownOpen(false);
  };

  return (
    <div className="h-12 shrink-0 z-40 bg-page-bg/95 backdrop-blur-sm border-b border-border-subtle px-5 flex items-center justify-between select-none">
      {/* LEFT: Current View Title */}
      <h1 className="text-sm font-semibold text-text-primary tracking-tight">
        {title}
      </h1>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2">
        {/* [+ New folder] button */}
        {showNewFolderButton && (
          <button
            onClick={onNewFolderClick}
            className="h-[30px] px-3 bg-transparent border border-border-default hover:bg-card-hover hover:text-text-primary text-text-secondary text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} />
            <span>New folder</span>
          </button>
        )}

        {/* [Sort ▾] button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            className="h-[30px] px-3 bg-transparent border border-border-default hover:bg-card-hover hover:text-text-primary text-text-secondary text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowUpDown size={14} />
            <span>
              Sort: {sortField === 'name' ? 'Name' : sortField === 'size' ? 'Size' : 'Modified'} 
              {sortOrder === 'asc' ? ' ↑' : ' ↓'}
            </span>
          </button>

          {isSortDropdownOpen && (
            <>
              {/* Overlay blocker */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsSortDropdownOpen(false)} 
              />
              {/* Dropdown Box */}
              <div className="absolute right-0 mt-1 w-44 bg-overlay border border-border-default rounded-lg py-1 shadow-lg z-20">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.field}
                    onClick={() => handleSortSelect(opt.field)}
                    className="w-full h-8 px-3 flex items-center justify-between text-left text-xs text-text-primary hover:bg-border-subtle hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{opt.label}</span>
                    {sortField === opt.field && (
                      <Check size={12} className="text-accent" />
                    )}
                  </button>
                ))}
                <div className="border-t border-border-subtle my-1"></div>
                <button
                  onClick={() => {
                    onSortChange(sortField, sortOrder === 'asc' ? 'desc' : 'asc');
                    setIsSortDropdownOpen(false);
                  }}
                  className="w-full h-8 px-3 flex items-center text-left text-[11px] text-text-secondary hover:bg-border-subtle hover:text-white transition-colors cursor-pointer"
                >
                  <span>Toggle Direction ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* View Toggle (Grid vs List) */}
        <div className="h-[30px] border border-border-default rounded-lg overflow-hidden flex items-center bg-transparent">
          {/* Grid View button */}
          <button
            onClick={() => onViewModeChange('grid')}
            className={`w-[30px] h-full flex items-center justify-center transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
            }`}
            title="Grid View (⊞)"
          >
            <LayoutGrid size={14} />
          </button>
          
          {/* List View button */}
          <button
            onClick={() => onViewModeChange('list')}
            className={`w-[30px] h-full flex items-center justify-center border-l border-border-default transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
            }`}
            title="List View (☰)"
          >
            <List size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

