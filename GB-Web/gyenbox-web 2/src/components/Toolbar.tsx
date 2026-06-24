import React, { useState } from 'react';
import { FolderPlus, ChevronDown, Grid, List, ArrowUpDown } from 'lucide-react';
import { SortField, SortOrder } from '../types';

interface ToolbarProps {
  title: string;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  onNewFolderClick: () => void;
  showNewFolderBtn: boolean;
}

export default function Toolbar({
  title,
  viewMode,
  setViewMode,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  onNewFolderClick,
  showNewFolderBtn
}: React.PropsWithChildren<ToolbarProps>) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const handleSortSelect = (field: SortField) => {
    if (sortField === field) {
      // Toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // default to descending/latest
    }
    setShowSortDropdown(false);
  };

  const getSortLabel = () => {
    switch (sortField) {
      case 'name': return 'Name';
      case 'size': return 'Size';
      case 'modified': return 'Date';
      default: return 'Sort';
    }
  };

  return (
    <div className="sticky top-[56px] h-12 bg-[#07070E] border-b border-[#1E1E2E] px-5 flex items-center gap-2 z-90 select-none" id="toolbar">
      {/* LEFT: SECTION OR DIRECTORY TITLE */}
      <h1 className="font-sans font-semibold text-[16px] text-[#EEEEF8]" id="toolbar-title">
        {title}
      </h1>

      {/* RIGHT: ACTION MODULES */}
      <div className="ml-auto flex items-center gap-2" id="toolbar-actions">
        {/* New Folder Button */}
        {showNewFolderBtn && (
          <button
            onClick={onNewFolderClick}
            id="new-folder-btn"
            className="h-[30px] px-3 bg-transparent border border-[#2A2A3D] rounded-lg text-[12px] font-semibold text-[#8A8AA8] hover:bg-[#171724] hover:text-[#EEEEF8] cursor-pointer flex items-center gap-1.5 transition-colors duration-150"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New folder</span>
          </button>
        )}

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            id="sort-menu-btn"
            className="h-[30px] px-3 bg-transparent border border-[#2A2A3D] rounded-lg text-[12px] font-semibold text-[#8A8AA8] hover:bg-[#171724] hover:text-[#EEEEF8] cursor-pointer flex items-center gap-1.5 transition-colors duration-150"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort: {getSortLabel()} {sortOrder === 'asc' ? '▲' : '▼'}</span>
            <ChevronDown className="w-3 h-3 text-[#4A4A6A]" />
          </button>

          {showSortDropdown && (
            <>
              {/* Backing screen block to close */}
              <div 
                className="fixed inset-0 z-150" 
                onClick={() => setShowSortDropdown(false)} 
              />
              <div className="absolute right-0 mt-1.5 w-40 bg-[#1F1F2E] border border-[#2A2A3D] rounded-lg p-1 shadow-xl z-200" id="sort-dropdown-menu">
                <button
                  onClick={() => handleSortSelect('name')}
                  className={`w-full px-2.5 py-1.5 text-left text-[12px] font-medium rounded-md cursor-pointer flex items-center justify-between ${
                    sortField === 'name' ? 'bg-[#7C6AF7]/12 text-[#A99FF8]' : 'text-[#EEEEF8] hover:bg-[#2A2A3D]'
                  }`}
                >
                  <span>Name</span>
                  {sortField === 'name' && <span className="text-[10px]">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>}
                </button>
                <button
                  onClick={() => handleSortSelect('size')}
                  className={`w-full px-2.5 py-1.5 text-left text-[12px] font-medium rounded-md cursor-pointer flex items-center justify-between ${
                    sortField === 'size' ? 'bg-[#7C6AF7]/12 text-[#A99FF8]' : 'text-[#EEEEF8] hover:bg-[#2A2A3D]'
                  }`}
                >
                  <span>Size</span>
                  {sortField === 'size' && <span className="text-[10px]">{sortOrder === 'asc' ? 'Min' : 'Max'}</span>}
                </button>
                <button
                  onClick={() => handleSortSelect('modified')}
                  className={`w-full px-2.5 py-1.5 text-left text-[12px] font-medium rounded-md cursor-pointer flex items-center justify-between ${
                    sortField === 'modified' ? 'bg-[#7C6AF7]/12 text-[#A99FF8]' : 'text-[#EEEEF8] hover:bg-[#2A2A3D]'
                  }`}
                >
                  <span>Date Modified</span>
                  {sortField === 'modified' && <span className="text-[10px]">{sortOrder === 'asc' ? 'Oldest' : 'Latest'}</span>}
                </button>
              </div>
            </>
          )}
        </div>

        {/* View mode toggle (grid/list) */}
        <div className="flex border border-[#2A2A3D] rounded-lg overflow-hidden h-[30px]" id="view-mode-toggle">
          <button
            onClick={() => setViewMode('grid')}
            id="view-grid-btn"
            className={`w-[30px] flex items-center justify-center cursor-pointer transition-colors duration-150 ${
              viewMode === 'grid'
                ? 'bg-[#7C6AF7] text-white'
                : 'bg-transparent text-[#8A8AA8] hover:text-[#EEEEF8] hover:bg-[#171724]'
            }`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            id="view-list-btn"
            className={`w-[30px] flex items-center justify-center cursor-pointer transition-colors duration-150 ${
              viewMode === 'list'
                ? 'bg-[#7C6AF7] text-white'
                : 'bg-transparent text-[#8A8AA8] hover:text-[#EEEEF8] hover:bg-[#171724]'
            }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
