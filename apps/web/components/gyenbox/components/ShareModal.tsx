import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, Check, Link, Eye, Calendar, Lock } from 'lucide-react';
import { FileItem } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  file: FileItem | null;
  onClose: () => void;
  onInvite: (email: string, role: string) => void;
}

export default function ShareModal({ isOpen, file, onClose, onInvite }: ShareModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState('viewer');
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const publicLink = `https://gyenbox.com/s/${file.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    onInvite(emailInput.trim(), role);
    setEmailInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center select-none" id="share-modal-container">
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#07070E]/85 backdrop-blur-[4px] cursor-pointer"
          />

          {/* MODAL BOX */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-[480px] bg-[#0F0F1A] border border-[#2A2A3D] rounded-2xl shadow-2xl overflow-hidden z-10"
            id="share-modal"
          >
            {/* HEADER */}
            <div className="px-6 py-5 border-b border-[#1E1E2E] flex items-center justify-between">
              <h2 className="font-sans font-semibold text-[16px] text-[#EEEEF8] truncate pr-4">
                Share {file.name}
              </h2>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-md hover:bg-[#1E1E2E] text-[#8A8AA8] hover:text-[#EEEEF8] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 flex flex-col gap-5">
              {/* SECTION 1 - INVITE PEOPLE */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase">
                  Invite People
                </label>
                <form onSubmit={handleInviteSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Add email..."
                    className="flex-1 h-[38px] bg-[#13131F] border border-[#2A2A3D] rounded-lg px-3.5 text-[13px] text-[#EEEEF8] placeholder-[#4A4A6A] focus:outline-none focus:border-[#7C6AF7] focus:ring-1 focus:ring-[#7C6AF7]/50"
                  />
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="h-[38px] pl-3 pr-8 bg-transparent border border-[#2A2A3D] rounded-lg text-[13px] text-[#EEEEF8] font-medium appearance-none focus:outline-none cursor-pointer hover:bg-[#171724]"
                    >
                      <option value="viewer" className="bg-[#0F0F1A]">Can view</option>
                      <option value="editor" className="bg-[#0F0F1A]">Can edit</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8A8AA8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    className="h-[38px] px-4 bg-[#7C6AF7] hover:bg-[#5B4FD4] text-white text-[13px] font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Invite
                  </button>
                </form>
              </div>

              {/* SEPARATOR */}
              <div className="h-[1px] bg-[#1E1E2E]" />

              {/* SECTION 2 - LINK SHARING */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#4A4A6A] tracking-[0.08em] uppercase">
                    Anyone with Link
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#8A8AA8]">Public access</span>
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
                        isPublic ? 'bg-[#7C6AF7]' : 'bg-[#2A2A3D]'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                          isPublic ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE PUBLIC LINK PANEL */}
                <AnimatePresence>
                  {isPublic && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden flex flex-col gap-3"
                    >
                      {/* Public Link Input bar */}
                      <div className="flex gap-2">
                        <div className="flex-1 h-[38px] bg-[#13131F] border border-[#2A2A3D] rounded-lg px-3 flex items-center gap-2 overflow-hidden">
                          <Link className="w-3.5 h-3.5 text-[#4A4A6A]" />
                          <input
                            type="text"
                            readOnly
                            value={publicLink}
                            className="w-full bg-transparent text-[12px] font-mono text-[#A99FF8] focus:outline-none select-all"
                          />
                        </div>
                        <button
                          onClick={handleCopyLink}
                          className={`h-[38px] px-4 rounded-lg font-semibold text-[13px] transition-all cursor-pointer flex items-center justify-center gap-1 min-w-[100px] ${
                            copied
                              ? 'bg-[#1DB877]/10 text-[#1DB877] border border-[#1DB877]/30'
                              : 'bg-[#7C6AF7] hover:bg-[#5B4FD4] text-white'
                          }`}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <span>Copy link</span>
                          )}
                        </button>
                      </div>

                      {/* Settings Row */}
                      <div className="flex flex-wrap gap-2 text-[12px] text-[#8A8AA8]">
                        <button className="h-8 px-3 rounded-lg border border-[#2A2A3D] flex items-center gap-1.5 hover:bg-[#171724] cursor-pointer">
                          <Eye className="w-3.5 h-3.5 text-[#4A4A6A]" />
                          <span>Can view</span>
                          <ChevronDown className="w-3 h-3 text-[#4A4A6A]" />
                        </button>
                        <button className="h-8 px-3 rounded-lg border border-[#2A2A3D] flex items-center gap-1.5 hover:bg-[#171724] cursor-pointer">
                          <Calendar className="w-3.5 h-3.5 text-[#4A4A6A]" />
                          <span>No expiry</span>
                          <ChevronDown className="w-3 h-3 text-[#4A4A6A]" />
                        </button>
                        <button className="h-8 px-3 rounded-lg border border-[#2A2A3D] flex items-center gap-1.5 hover:bg-[#171724] cursor-pointer text-[#4A4A6A] hover:text-[#EEEEF8]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>+ Password</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 bg-[#13131F]/40 border-t border-[#1E1E2E] flex items-center justify-between">
              <span className="text-[12px] text-[#8A8AA8]">
                {file.shared ? 'Shared with 1 person' : 'Only you have access'}
              </span>
              <button
                onClick={onClose}
                className="h-8 px-5 bg-[#7C6AF7] hover:bg-[#5B4FD4] text-white text-[13px] font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
