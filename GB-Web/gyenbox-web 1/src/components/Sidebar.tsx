import { Home, Folder, Users, Star, Clock, Trash2, Link, FileText } from 'lucide-react';
import { FileItem } from '../types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  files: FileItem[];
  onUpgradeClick: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  files,
  onUpgradeClick,
}: SidebarProps) {
  // Let's compute storage usage dynamically
  // Capacity: 10 GB (in bytes = 10 * 1024 * 1024 * 1024)
  const TOTAL_CAPACITY_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
  
  // Base offset to make the storage look occupied around 5.8 GB as requested.
  // 5.8 GB of 10 GB used initially.
  // Let's declare base sizes in bytes:
  const baseImagesBytes = 5.5 * 1024 * 1024 * 1024; // 5.5 GB
  const baseDocsBytes = 0.8 * 1024 * 1024 * 1024;   // 0.8 GB
  const basePdfsBytes = 0.5 * 1024 * 1024 * 1024;   // 0.5 GB
  
  // Now add dynamic size changes from actual user uploaded files
  const activeFiles = files.filter(f => !f.isTrash && f.type !== 'folder');
  
  const userImagesBytes = activeFiles
    .filter(f => f.type === 'png')
    .reduce((sum, f) => sum + f.sizeBytes, 0);

  const userDocsBytes = activeFiles
    .filter(f => f.type === 'docx' || f.type === 'xlsx' || f.type === 'txt')
    .reduce((sum, f) => sum + f.sizeBytes, 0);

  const userPdfsBytes = activeFiles
    .filter(f => f.type === 'pdf')
    .reduce((sum, f) => sum + f.sizeBytes, 0);

  // Total calculated usage (base + user changes)
  const totalImages = baseImagesBytes + userImagesBytes;
  const totalDocs = baseDocsBytes + userDocsBytes;
  const totalPdfs = basePdfsBytes + userPdfsBytes;

  // Let's ensure the sum of usage fits nicely on a 10GB scale
  const totalUsedBytes = totalImages + totalDocs + totalPdfs;
  const totalUsedGB = (totalUsedBytes / (1024 * 1024 * 1024)).toFixed(1);

  // Compute percentages
  const pctImages = Math.min(60, (totalImages / TOTAL_CAPACITY_BYTES) * 100);
  const pctDocs = Math.min(15, (totalDocs / TOTAL_CAPACITY_BYTES) * 100);
  const pctPdfs = Math.min(10, (totalPdfs / TOTAL_CAPACITY_BYTES) * 100);

  const navItemsMain = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'my-files', label: 'My Files', icon: Folder },
    { id: 'shared', label: 'Shared with me', icon: Users },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const navItemsTools = [
    { id: 'requests', label: 'File Requests', icon: Link },
    { id: 'docs', label: 'Docs', icon: FileText },
  ];

  return (
    <nav className="w-[220px] h-full bg-surface border-r border-border-subtle p-4 flex flex-col shrink-0 overflow-y-auto select-none">
      {/* SECTION: MAIN NAVIGATION */}
      <span className="text-[11px] font-semibold text-text-muted tracking-wider uppercase ml-2 mb-2">
        Main
      </span>
      <div className="flex flex-col gap-1">
        {navItemsMain.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`h-[34px] px-2.5 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[rgba(124,106,247,0.12)] text-accent-text border-l-2 border-accent pl-2'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-accent' : 'text-text-secondary'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION: TOOLS */}
      <span className="text-[11px] font-semibold text-text-muted tracking-wider uppercase ml-2 mt-5 mb-2">
        Tools
      </span>
      <div className="flex flex-col gap-1">
        {navItemsTools.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`h-[34px] px-2.5 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[rgba(124,106,247,0.12)] text-accent-text border-l-2 border-accent pl-2'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-accent' : 'text-text-secondary'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* FLEX SPACER */}
      <div className="flex-1 min-h-[30px]" />

      {/* STORAGE SECTION (bottom) */}
      <div className="p-2.5 border-t border-border-subtle/50 mt-auto bg-card-bg/20 rounded-lg">
        <div className="flex justify-between text-[11px] font-medium text-text-secondary mb-1.5">
          <span>Storage</span>
          <span className="font-mono text-text-muted">{totalUsedGB} / 10 GB</span>
        </div>

        {/* Progress bar container (all segments sit inline on the same 3px bar) */}
        <div className="h-[3px] w-full bg-border-default rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${pctImages}%` }} 
            className="h-full bg-accent transition-all duration-500" 
            title={`Images: ${pctImages.toFixed(1)}%`}
          />
          <div 
            style={{ width: `${pctDocs}%` }} 
            className="h-full bg-[#FF6B9D] transition-all duration-500" 
            title={`Docs: ${pctDocs.toFixed(1)}%`}
          />
          <div 
            style={{ width: `${pctPdfs}%` }} 
            className="h-full bg-info transition-all duration-500" 
            title={`PDFs: ${pctPdfs.toFixed(1)}%`}
          />
        </div>

        {/* Legend row */}
        <div className="flex items-center gap-2 flex-wrap mt-2 select-none">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[10px] text-text-muted">Images</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B9D]" />
            <span className="text-[10px] text-text-muted">Docs</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-info" />
            <span className="text-[10px] text-text-muted">PDFs</span>
          </div>
        </div>

        {/* Upgrade Link */}
        <button
          onClick={onUpgradeClick}
          className="mt-3 block text-left text-xs font-medium text-accent-text hover:text-accent cursor-pointer transition-colors"
        >
          Get more storage →
        </button>
      </div>
    </nav>
  );
}
