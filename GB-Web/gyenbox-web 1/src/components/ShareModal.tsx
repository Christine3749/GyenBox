import React, { useState } from 'react';
import { X, Globe, Link as LinkIcon, Check, Shield, Calendar, Users } from 'lucide-react';
import { FileItem } from '../types';

interface ShareModalProps {
  file: FileItem | null;
  onClose: () => void;
  onAddToast: (title: string, body: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export default function ShareModal({
  file,
  onClose,
  onAddToast,
}: ShareModalProps) {
  if (!file) return null;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'view' | 'edit'>('view');
  const [isPublic, setIsPublic] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const shareLink = `https://gyenbox.com/s/${file.id.replace('file-', '').replace('folder-', '') || 'xK9mPqR2'}`;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    // Simple validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      onAddToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }

    const invited = email.trim();
    setInvitedEmails(prev => [...prev, invited]);
    onAddToast('Invitation Sent', `Invited ${invited} as a ${role === 'view' ? 'viewer' : 'editor'}.`, 'success');
    setEmail('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    onAddToast('Link Copied', 'Share link is saved to your clipboard.', 'success');
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const totalShared = 1 + invitedEmails.length;

  return (
    <div className="fixed inset-0 bg-page-bg/85 backdrop-blur-[4px] z-[200] flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      {/* MODAL BOX */}
      <div className="w-full max-w-[480px] bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="font-sans font-semibold text-sm text-text-primary truncate" title={file.name}>
              Share "{file.name}"
            </h2>
            <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider font-mono">
              Link Sharing Settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 flex flex-col gap-5">
          {/* Section 1 — Invite people */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Invite people
            </span>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Add email..."
                className="h-[38px] px-3 flex-1 bg-card-bg border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="h-[38px] px-3 bg-transparent border border-border-default text-text-secondary text-xs rounded-lg hover:text-text-primary hover:bg-card-hover cursor-pointer transition-colors flex items-center gap-1"
                >
                  <span>{role === 'view' ? 'Can view' : 'Can edit'}</span>
                  <span className="text-[9px]">▼</span>
                </button>
                {showRoleDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowRoleDropdown(false)} />
                    <div className="absolute right-0 mt-1 w-28 bg-overlay border border-border-default rounded-lg py-1 shadow-lg z-20">
                      <button
                        type="button"
                        onClick={() => { setRole('view'); setShowRoleDropdown(false); }}
                        className="w-full text-left h-8 px-3 text-xs text-text-primary hover:bg-border-subtle transition-colors"
                      >
                        Can view
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRole('edit'); setShowRoleDropdown(false); }}
                        className="w-full text-left h-8 px-3 text-xs text-text-primary hover:bg-border-subtle transition-colors"
                      >
                        Can edit
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                type="submit"
                className="h-[38px] px-4 bg-accent hover:bg-accent-dim text-white font-sans font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Invite
              </button>
            </form>
          </div>

          <div className="h-[1px] bg-border-subtle" />

          {/* Section 2 — Link sharing */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Anyone with link
              </span>
              {/* TOGGLE SWITCH */}
              <button
                type="button"
                onClick={() => {
                  setIsPublic(!isPublic);
                  onAddToast(
                    'Access Updated', 
                    !isPublic ? 'Public link sharing is now enabled.' : 'Public link sharing disabled.', 
                    'info'
                  );
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                  isPublic ? 'bg-accent' : 'bg-border-strong'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    isPublic ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-sans">Public link</span>
              <span className="text-[11px] font-mono text-text-muted">
                {isPublic ? 'Anyone can access' : 'Only invited members'}
              </span>
            </div>

            {/* EXPANDABLE SECTION */}
            <div
              className={`transition-all duration-300 overflow-hidden flex flex-col gap-3 ${
                isPublic ? 'max-h-[140px] opacity-100 mt-1' : 'max-h-0 opacity-0'
              }`}
            >
              {/* Link Input Row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="h-9 px-3 flex-1 bg-card-bg border border-border-default rounded-lg text-xs font-mono text-text-secondary select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`h-9 px-4 rounded-lg font-sans font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    isCopied 
                      ? 'bg-success/15 border border-success/30 text-success' 
                      : 'bg-accent hover:bg-accent-dim text-white'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check size={12} strokeWidth={3} />
                      <span>Copied! ✓</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon size={12} />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Settings row */}
              <div className="flex gap-2 text-[11px] text-text-secondary">
                <button 
                  type="button"
                  onClick={() => onAddToast('Setting Changed', 'Access level set to View Only.', 'info')}
                  className="h-7 px-2.5 border border-border-subtle rounded-md hover:bg-card-hover flex items-center gap-1 cursor-pointer"
                >
                  <Globe size={11} className="text-text-muted" />
                  <span>Can view ▾</span>
                </button>
                <button 
                  type="button"
                  onClick={() => onAddToast('Expiry Configured', 'Access expiry dates requires professional upgrade.', 'warning')}
                  className="h-7 px-2.5 border border-border-subtle rounded-md hover:bg-card-hover flex items-center gap-1 cursor-pointer"
                >
                  <Calendar size={11} className="text-text-muted" />
                  <span>No expiry ▾</span>
                </button>
                <button 
                  type="button"
                  onClick={() => onAddToast('Security Enabled', 'Password enforcement enabled for link.', 'success')}
                  className="h-7 px-2.5 border border-border-subtle rounded-md hover:bg-card-hover flex items-center gap-1 cursor-pointer text-accent-text"
                >
                  <Shield size={11} />
                  <span>+ Password</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-surface border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Users size={13} className="text-text-muted" />
            <span>Shared with {totalShared} {totalShared === 1 ? 'person' : 'people'}</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 px-5 bg-accent hover:bg-accent-dim text-white font-sans font-semibold text-xs rounded-lg cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
