import React, { useState, useEffect, useCallback } from 'react';
import { CikuEntry, EntryLevel, FrequencyStats, KeepCard, LibraryItem, PendingSubmission, SyncStatus, AppTheme, AppLang, InputScheme } from './types/ciku';
import { CikuApiService } from './services/api';
import { INITIAL_LIBRARIES } from './data/initialData';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { SearchView } from './components/SearchView';
import { FrequencyView } from './components/FrequencyView';
import { MyLibrariesView } from './components/MyLibrariesView';
import { PublicLibrariesView } from './components/PublicLibrariesView';
import { SyncView } from './components/SyncView';
import { PrivacyView } from './components/PrivacyView';
import { InputSettingsView } from './components/InputSettingsView';
import { PersonalCenterView } from './components/PersonalCenterView';
import { EntryDetailModal } from './components/EntryDetailModal';
import { KeepModal } from './components/KeepModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [lang, setLang] = useState<AppLang>('zh');
  const [scheme, setScheme] = useState<InputScheme>('ALL');

  const [activeView, setActiveView] = useState<string>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [entries, setEntries] = useState<CikuEntry[]>([]);
  const [freqStats, setFreqStats] = useState<FrequencyStats>({
    onceCount: 0,
    memoryCount: 0,
    highCount: 0,
    fixedCount: 0,
    totalCount: 0
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CikuApiService.getSyncStatus());
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);

  // Modals & Selected items
  const [selectedEntry, setSelectedEntry] = useState<CikuEntry | null>(null);
  const [createdKeepCard, setCreatedKeepCard] = useState<KeepCard | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Toast messages
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      message
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch initial entries & stats
  const loadData = useCallback(async () => {
    const list = await CikuApiService.getEntries();
    setEntries(list);
    const stats = await CikuApiService.getFrequencyStats();
    setFreqStats(stats);
    setSubmissions(CikuApiService.getSubmissions());
  }, []);

  useEffect(() => {
    loadData();
    // Health check
    CikuApiService.getHealth().then((h) => {
      console.log('ciku API Service status:', h);
    });
  }, [loadData]);

  // Actions
  const handleToggleFavorite = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    const updated = await CikuApiService.updatePersonalEntry(id, {
      isFavorited: !target.isFavorited
    });
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (selectedEntry?.id === id) {
      setSelectedEntry(updated);
    }
    showToast(updated.isFavorited ? '已将词条加入收藏' : '已取消收藏', 'info');
  };

  const handleTogglePin = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    const nextPinned = !target.isPinned;
    const updated = await CikuApiService.updatePersonalEntry(id, {
      isPinned: nextPinned,
      level: nextPinned ? 'FIXED' : 'HIGH'
    });
    await loadData();
    if (selectedEntry?.id === id) {
      setSelectedEntry(updated);
    }
    showToast(nextPinned ? '已设定为【固定词】，永久最高权重展现' : '已取消固定', 'success');
  };

  const handleAddToPersonal = async (entry: CikuEntry) => {
    await CikuApiService.createPersonalEntry({
      word: entry.word,
      pinyin: entry.pinyin,
      pos: entry.pos,
      definition: entry.definition,
      exampleSentences: entry.exampleSentences,
      relatedTerms: entry.relatedTerms,
      usageCount: entry.usageCount + 1,
      category: 'PERSONAL',
      sourceLibrary: '我的个人词库',
      level: 'MEMORY',
      isFavorited: true,
      isPinned: false,
      tags: [...entry.tags, '已导入'],
      trend7d: 10,
      trend30d: 20
    });
    await loadData();
    showToast(`词条【${entry.word}】已加入个人词库`, 'success');
  };

  const handleSavePersonalNotes = async (id: string, notes: string, definition: string) => {
    const updated = await CikuApiService.updatePersonalEntry(id, {
      personalNotes: notes,
      definition
    });
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (selectedEntry?.id === id) {
      setSelectedEntry(updated);
    }
    showToast('个人释义已更新保存', 'success');
  };

  const handleAddToKeep = (entry: CikuEntry) => {
    const card = CikuApiService.addToKeep(entry);
    setCreatedKeepCard(card);
    showToast(`已生成 Keep 复习卡片: 【${entry.word}】`, 'success');
  };

  const handleDeletePersonal = async (id: string) => {
    await CikuApiService.deletePersonalEntry(id);
    setSelectedEntry(null);
    await loadData();
    showToast('个人记录已清空删除', 'info');
  };

  const handleUpdateLevel = async (id: string, newLevel: EntryLevel) => {
    const isPinned = newLevel === 'FIXED';
    await CikuApiService.updatePersonalEntry(id, {
      level: newLevel,
      isPinned
    });
    await loadData();
    showToast(`词频等级已更变为 ${newLevel}`, 'success');
  };

  const handleRunManualSync = () => {
    const now = new Date().toLocaleTimeString();
    setSyncStatus((prev) => ({
      ...prev,
      lastSyncTime: `刚刚 (${now})`,
      revision: `rev.4.8.2-${Math.random().toString(36).substring(2, 6)}`
    }));
    showToast('手动作业增量同步完成！', 'success');
  };

  const isLight = theme === 'light';

  // Filter entries based on selected scheme if scheme !== 'ALL'
  const filteredEntries = entries.filter((e) => {
    if (scheme === 'WUBI') return Boolean(e.wubi);
    if (scheme === 'SHUANGPIN') return Boolean(e.shuangpin || e.cangjie);
    if (scheme === 'PINYIN') return Boolean(e.pinyin);
    return true;
  });

  return (
    <div className={`ciku-app-root min-h-screen font-sans flex flex-col antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
      isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#090a0e] text-zinc-300'
    }`}>
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenImportModal={() => {
          setActiveView('my-libraries');
        }}
        onOpenNewTermModal={() => {
          setActiveView('my-libraries');
        }}
        onOpenSyncView={() => setActiveView('sync')}
        activeView={activeView}
        onViewChange={setActiveView}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        lastSyncTime={syncStatus.lastSyncTime}
        theme={theme}
        onToggleTheme={toggleTheme}
        lang={lang}
        onToggleLang={toggleLang}
        scheme={scheme}
        onSchemeChange={setScheme}
      />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar Navigation */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          selectedLevel={selectedLevel}
          onLevelSelect={setSelectedLevel}
          entries={filteredEntries}
          pendingCount={submissions.filter((s) => s.status === 'PENDING').length + 128}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
          theme={theme}
          lang={lang}
        />

        {/* Main Content Area */}
        <main className={`ciku-app-main flex-1 p-4 lg:p-6 overflow-y-auto max-w-full transition-colors duration-200 ${
          isLight ? 'bg-slate-50' : 'bg-[#090a0e]'
        }`}>
          {activeView === 'overview' && (
            <OverviewView
              entries={filteredEntries}
              freqStats={freqStats}
              syncStatus={syncStatus}
              onSelectEntry={setSelectedEntry}
              onOpenImportModal={() => setActiveView('my-libraries')}
              onRunManualSync={handleRunManualSync}
              onNavigateSearch={(q) => {
                if (q !== undefined) setSearchQuery(q);
                setActiveView('search');
              }}
            />
          )}

          {(activeView === 'search' || activeView === 'categories') && (
            <SearchView
              query={searchQuery}
              onQueryChange={setSearchQuery}
              entries={filteredEntries}
              onSelectEntry={setSelectedEntry}
              onToggleFavorite={handleToggleFavorite}
              onTogglePin={handleTogglePin}
            />
          )}

          {activeView === 'input-settings' && (
            <InputSettingsView onShowToast={showToast} />
          )}

          {activeView === 'personal-center' && (
            <PersonalCenterView
              entries={filteredEntries}
              syncStatus={syncStatus}
              onNavigate={setActiveView}
            />
          )}

          {activeView === 'frequency' && (
            <FrequencyView
              entries={filteredEntries}
              onSelectEntry={setSelectedEntry}
              onUpdateLevel={handleUpdateLevel}
            />
          )}

          {activeView === 'my-libraries' && (
            <MyLibrariesView
              entries={filteredEntries}
              onRefreshEntries={loadData}
              onSelectEntry={setSelectedEntry}
              onShowToast={showToast}
            />
          )}

          {activeView === 'public-libraries' && (
            <PublicLibrariesView
              libraries={INITIAL_LIBRARIES}
              submissions={submissions}
              onRefreshSubmissions={loadData}
              onShowToast={showToast}
            />
          )}

          {activeView === 'sync' && (
            <SyncView
              syncStatus={syncStatus}
              onRunSync={handleRunManualSync}
              onShowToast={showToast}
            />
          )}

          {activeView === 'privacy' && (
            <PrivacyView onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <EntryDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onToggleFavorite={handleToggleFavorite}
        onTogglePin={handleTogglePin}
        onUpdateLevel={handleUpdateLevel}
        onSendToKeep={handleAddToKeep}
        onDeleteEntry={handleDeletePersonal}
        theme={theme}
        lang={lang}
      />

      <KeepModal
        card={createdKeepCard}
        onClose={() => setCreatedKeepCard(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
