import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LockScreen } from "./components/LockScreen";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { AccountItem } from "./components/AccountItem";
import { AddAccountModal } from "./components/AddAccountModal";
import { AccountDetailModal } from "./components/AccountDetailModal";
import { SecurityAuditModal } from "./components/SecurityAuditModal";
import { SecurityAboutModal } from "./components/SecurityAboutModal";
import { BackupModal } from "./components/BackupModal";
import { Toast } from "./components/Toast";

import {
  Account,
  BackupRecord,
  CategoryId,
  SecurityAuditResult,
  ThemeMode,
  EncryptedVaultPayload,
  VaultData,
  ViewMode,
} from "./types";
import { INITIAL_ACCOUNTS, INITIAL_BACKUPS } from "./data/initialData";
import { ShieldCheck, Plus, Search, Sparkles, Filter } from "lucide-react";
import {
  VAULT_STORAGE_KEY,
  createEncryptedVault,
  reencryptVault,
  unlockEncryptedVault,
} from "./lib/crypto";

interface SecurityAuditApiResponse {
  success?: boolean;
  data?: SecurityAuditResult;
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function readLegacyVaultData(): VaultData {
  return {
    accounts: readJson<Account[]>("safeauth_accounts") ?? INITIAL_ACCOUNTS,
    backups: readJson<BackupRecord[]>("safeauth_backups") ?? INITIAL_BACKUPS,
  };
}

export default function App() {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [vault, setVault] = useState<EncryptedVaultPayload | null>(() =>
    readJson<EncryptedVaultPayload>(VAULT_STORAGE_KEY),
  );
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const vaultRef = useRef(vault);
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const legacyDataRef = useRef<VaultData>(readLegacyVaultData());
  const accountsRef = useRef<Account[]>([]);
  const backupsRef = useRef<BackupRecord[]>([]);
  const persistenceQueueRef = useRef(Promise.resolve());

  // App Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem("safeauth_theme") as ThemeMode) || "dark";
  });

  // View Mode State (Default Compact List View)
  const [viewMode, setViewMode] = useState<ViewMode>("compact_list");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);

  // Search & Navigation Filters
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Unlocked Hidden Accounts in Current Session
  const [unlockedHiddenIds, setUnlockedHiddenIds] = useState<Set<string>>(new Set());

  // AI Security Audit State
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);

  // Modals & Triggers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSecurityAboutOpen, setIsSecurityAboutOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync Theme to LocalStorage and DOM
  useEffect(() => {
    localStorage.setItem("safeauth_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    backupsRef.current = backups;
  }, [backups]);

  useEffect(() => {
    masterKeyRef.current = masterKey;
  }, [masterKey]);

  // Sync Theme to HTML class
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("safeauth_theme", themeMode);
  }, [themeMode]);

  const persistVault = useCallback(async () => {
    const key = masterKeyRef.current;
    const currentVault = vaultRef.current;
    if (!key || !currentVault) return;

    const snapshot: VaultData = {
      accounts: accountsRef.current,
      backups: backupsRef.current,
    };

    persistenceQueueRef.current = persistenceQueueRef.current.then(async () => {
      const nextVault = await reencryptVault(snapshot, key, vaultRef.current ?? currentVault);
      vaultRef.current = nextVault;
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(nextVault));
      setVault(nextVault);
    });
    await persistenceQueueRef.current;
  }, []);

  useEffect(() => {
    if (!isLocked && masterKey) void persistVault();
  }, [accounts, backups, isLocked, masterKey, persistVault]);

  const createVault = useCallback(async (passphrase: string) => {
    if (!window.isSecureContext || !crypto.subtle) {
      throw new Error("此浏览器环境不支持安全加密，请使用 HTTPS 页面打开保险箱。");
    }
    const { vault: newVault, key } = await createEncryptedVault(legacyDataRef.current, passphrase);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(newVault));
    localStorage.removeItem("safeauth_accounts");
    localStorage.removeItem("safeauth_backups");
    localStorage.removeItem("safeauth_pin");
    vaultRef.current = newVault;
    masterKeyRef.current = key;
    accountsRef.current = legacyDataRef.current.accounts;
    backupsRef.current = legacyDataRef.current.backups;
    setVault(newVault);
    setMasterKey(key);
    setAccounts(legacyDataRef.current.accounts);
    setBackups(legacyDataRef.current.backups);
    setIsLocked(false);
  }, []);

  const unlockVault = useCallback(async (passphrase: string) => {
    const encryptedVault = vaultRef.current;
    if (!encryptedVault) throw new Error("未找到加密保险箱。请先创建一个新的本地保险箱。");
    const { data, key } = await unlockEncryptedVault(encryptedVault, passphrase);
    masterKeyRef.current = key;
    accountsRef.current = data.accounts;
    backupsRef.current = data.backups;
    setMasterKey(key);
    setAccounts(data.accounts);
    setBackups(data.backups);
    setUnlockedHiddenIds(new Set());
    setIsLocked(false);
  }, []);

  const lockVault = useCallback(() => {
    void persistVault();
    masterKeyRef.current = null;
    accountsRef.current = [];
    backupsRef.current = [];
    setMasterKey(null);
    setAccounts([]);
    setBackups([]);
    setUnlockedHiddenIds(new Set());
    setEditingAccount(null);
    setIsAddModalOpen(false);
    setIsBackupModalOpen(false);
    setIsAuditModalOpen(false);
    setIsSecurityAboutOpen(false);
    setIsLocked(true);
  }, [persistVault]);

  useEffect(() => {
    if (isLocked) return;
    const inactivityMs = 5 * 60 * 1000;
    let timer = window.setTimeout(lockVault, inactivityMs);
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lockVault, inactivityMs);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") lockVault();
      else resetTimer();
    };
    const activityEvents: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isLocked, lockVault]);

  // Fetch AI Security Audit (Strictly Metadata Only)
  const fetchSecurityAudit = async () => {
    setIsAuditLoading(true);
    try {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;

      // Calculate metadata
      const unused90Days = accounts.filter(
        (a) => !a.lastUsedTimestamp || now - a.lastUsedTimestamp > 90 * DAY
      );

      const categoryCounts: Record<string, number> = {};
      accounts.forEach((a) => {
        categoryCounts[a.categoryId] = (categoryCounts[a.categoryId] || 0) + 1;
      });

      const latestBackupTime = backups[0]?.timestamp || now - 30 * DAY;
      const daysSinceLastBackup = Math.floor((now - latestBackupTime) / DAY);

      const metadataPayload = {
        totalAccounts: accounts.length,
        categoryCounts,
        unusedAccountsCount90Days: unused90Days.length,
        daysSinceLastBackup,
        hiddenAccountsCount: accounts.filter((a) => a.isHidden).length,
        hasPinEnabled: Boolean(masterKey),
      };

      const res = await fetch("/api/security-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadataPayload),
      });

      const data = (await res.json()) as SecurityAuditApiResponse;
      if (data.success && data.data) {
        setAuditResult(data.data);
      }
    } catch (err) {
      console.warn("Audit request error:", err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Initial Security Audit Fetch when unlocked
  useEffect(() => {
    if (!isLocked) {
      fetchSecurityAudit();
    }
  }, [isLocked]);

  // Show toast utility
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Category Counts Memo
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryId, number> = {
      all: accounts.length,
      favorites: accounts.filter((a) => a.isFavorite).length,
      work: accounts.filter((a) => a.categoryId === "work").length,
      cloud: accounts.filter((a) => a.categoryId === "cloud").length,
      finance: accounts.filter((a) => a.categoryId === "finance").length,
      dev: accounts.filter((a) => a.categoryId === "dev").length,
      personal: accounts.filter((a) => a.categoryId === "personal").length,
      hidden: accounts.filter((a) => a.isHidden).length,
    };
    return counts;
  }, [accounts]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Category filter
      if (selectedCategory === "favorites" && !acc.isFavorite) return false;
      if (selectedCategory === "hidden" && !acc.isHidden) return false;
      if (
        selectedCategory !== "all" &&
        selectedCategory !== "favorites" &&
        selectedCategory !== "hidden" &&
        acc.categoryId !== selectedCategory
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchIssuer = acc.issuer.toLowerCase().includes(q);
        const matchName = acc.accountName.toLowerCase().includes(q);
        const matchNotes = acc.notes?.toLowerCase().includes(q) || false;
        if (!matchIssuer && !matchName && !matchNotes) return false;
      }

      return true;
    });
  }, [accounts, selectedCategory, searchQuery]);

  // Handlers for Account Actions
  const handleCopyCode = (code: string, issuer: string) => {
    navigator.clipboard.writeText(code);
    showToast(`已复制 ${issuer} 验证码: ${code}`);

    // Update last used timestamp
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.issuer === issuer ? { ...acc, lastUsedTimestamp: Date.now() } : acc
      )
    );
  };

  const handleToggleFavorite = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, isFavorite: !acc.isFavorite } : acc))
    );
  };

  const handleToggleHide = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;

    if (!acc.isHidden) {
      // Hiding account
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isHidden: true } : a))
      );
      showToast(`已将 ${acc.issuer} 设置为隐藏凭据`);
    } else {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isHidden: false } : a))
      );
      showToast(`已将 ${acc.issuer} 恢复显示`);
    }
  };

  const handleDeleteAccount = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (confirm(`确定要删除 ${acc?.issuer || "该"} 账号验证凭据吗？此操作不可撤销。`)) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      showToast("已成功删除凭据");
    }
  };

  const handleAddAccount = (newAccData: Omit<Account, "id" | "createdAt">) => {
    const newAcc: Account = {
      ...newAccData,
      id: `acc_${Date.now()}`,
      createdAt: Date.now(),
    };
    setAccounts((prev) => [newAcc, ...prev]);
    showToast(`成功添加 ${newAcc.issuer} 验证凭据`);
  };

  const handleSaveAccount = (updated: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast(`已更新 ${updated.issuer} 凭据设置`);
  };

  const handleRequirePinToUnlockHidden = (account: Account) => {
    setUnlockedHiddenIds((prev) => new Set([...prev, account.id]));
    showToast(`已在当前解锁会话中查看 ${account.issuer}`);
  };

  const handleTriggerAuditAction = (actionType: string) => {
    switch (actionType) {
      case "backup":
        setIsBackupModalOpen(true);
        break;
      case "review_unused":
        setSelectedCategory("all");
        setSearchQuery("");
        showToast("已筛选展示所有账号，可检查长期未使用凭据");
        break;
      case "check_hidden":
        setSelectedCategory("hidden");
        break;
      default:
        setIsSecurityAboutOpen(true);
    }
  };

  // Render Lock Screen if Locked
  if (isLocked) {
    return (
      <LockScreen
        hasVault={Boolean(vault)}
        onCreateVault={createVault}
        onUnlock={unlockVault}
      />
    );
  }

  return (
    <div
      className="sa-app-shell min-h-screen flex flex-col font-mono transition-colors duration-200"
    >
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        themeMode={themeMode}
        onThemeToggle={() =>
          setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
        }
        onAddAccount={() => setIsAddModalOpen(true)}
        onLockVault={lockVault}
        onOpenSecurityAbout={() => setIsSecurityAboutOpen(true)}
        accountCount={accounts.length}
      />

      {/* Main Full-Width Application Body */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10 w-full max-w-7xl mx-auto">
        {/* Sidebar Navigation & AI Audit Summary Card */}
        <Sidebar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categoryCounts={categoryCounts}
          auditResult={auditResult}
          isAuditLoading={isAuditLoading}
          onRefreshAudit={fetchSecurityAudit}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenSecurityAbout={() => setIsSecurityAboutOpen(true)}
        />

        {/* Account Content Workspace */}
        <main className="sa-main-content flex-1 p-4 lg:p-8 space-y-6 overflow-y-auto">
          {/* Section Toolbar / Title */}
          <div className="sa-section-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <div>
              <h2 className="sa-section-title text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {selectedCategory === "all"
                    ? "全部验证账号"
                    : selectedCategory === "favorites"
                    ? "重点收藏"
                    : selectedCategory === "hidden"
                    ? "受保护的隐藏专区"
                    : "分类视图"}
                </span>
                <span className="text-xs font-normal text-slate-400 font-mono">
                  ({filteredAccounts.length})
                </span>
              </h2>
              <p className="sa-section-description text-xs text-slate-500 mt-0.5">
                {viewMode === "compact_list"
                  ? "默认紧凑列表模式：安静收纳信息，点击行展开实时放大验证码"
                  : "网格卡片视图模式"}
              </p>
            </div>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-[#6D5EF5] hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                清除搜索条件 "{searchQuery}"
              </button>
            )}
          </div>

          {/* Accounts List Container */}
          {filteredAccounts.length === 0 ? (
            /* Empty State */
            <div className="sa-empty-state py-16 flex flex-col items-center justify-center text-center p-8 rounded-sm bg-white dark:bg-[#11121C] border border-slate-300 dark:border-slate-800 hud-box shadow-xs my-4 space-y-3 font-mono">
              <div className="p-3 rounded-sm bg-slate-100 dark:bg-[#161622] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800">
                <Search size={28} />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                [ NO_MATCHING_CREDENTIALS_FOUND ]
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-sans">
                可以通过顶部的“+ ADD”按钮录入新的 TOTP 二维码或密钥，亦或更换分类标签。
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-sm bg-[#6D5EF5] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5b4ce6] transition-all shadow-xs"
              >
                + ADD_ACCOUNT
              </button>
            </div>
          ) : viewMode === "compact_list" ? (
            /* Default Compact List View */
            <div className="space-y-1">
              {filteredAccounts.map((acc) => (
                <AccountItem
                  key={acc.id}
                  account={acc}
                  viewMode="compact_list"
                  onCopyCode={handleCopyCode}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleHide={handleToggleHide}
                  onEdit={(accountToEdit) => setEditingAccount(accountToEdit)}
                  onDelete={handleDeleteAccount}
                  onRequirePinToUnlockHidden={handleRequirePinToUnlockHidden}
                  isUnlockedInSession={unlockedHiddenIds.has(acc.id)}
                />
              ))}
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map((acc) => (
                <AccountItem
                  key={acc.id}
                  account={acc}
                  viewMode="grid"
                  onCopyCode={handleCopyCode}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleHide={handleToggleHide}
                  onEdit={(accountToEdit) => setEditingAccount(accountToEdit)}
                  onDelete={handleDeleteAccount}
                  onRequirePinToUnlockHidden={handleRequirePinToUnlockHidden}
                  isUnlockedInSession={unlockedHiddenIds.has(acc.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAccount={handleAddAccount}
      />

      <AccountDetailModal
        isOpen={!!editingAccount}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSaveAccount={handleSaveAccount}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        accounts={accounts}
        backups={backups}
        onRestoreAccounts={(restored) => {
          setAccounts(restored);
          showToast(`已成功导入恢复 ${restored.length} 个凭据账号`);
        }}
        onAddBackupRecord={(rec) => setBackups((prev) => [rec, ...prev])}
      />

      <SecurityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditResult={auditResult}
        isLoading={isAuditLoading}
        onTriggerAction={handleTriggerAuditAction}
      />

      <SecurityAboutModal
        isOpen={isSecurityAboutOpen}
        onClose={() => setIsSecurityAboutOpen(false)}
      />

      {/* Copy Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
