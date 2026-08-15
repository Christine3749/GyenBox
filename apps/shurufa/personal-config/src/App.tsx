import React, { useState, useEffect } from 'react';
import { GYConfig, LearnedWord, GYDevice, SyncLog, NavSection } from './types';
import { initialConfig, initialWords, initialDevices, initialSyncLogs } from './data/initialData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OverviewSection } from './components/OverviewSection';
import { SettingsSection } from './components/SettingsSection';
import { LearningSection } from './components/LearningSection';
import { DevicesSection } from './components/DevicesSection';
import { SyncCenterSection } from './components/SyncCenterSection';
import { ChangelogSection } from './components/ChangelogSection';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ImportExportModal } from './components/ImportExportModal';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [config, setConfig] = useState<GYConfig>(initialConfig);
  const [words, setWords] = useState<LearnedWord[]>(initialWords);
  const [devices, setDevices] = useState<GYDevice[]>(initialDevices);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(initialSyncLogs);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'conflict'>('synced');
  
  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [importExportMode, setImportExportMode] = useState<'export' | 'import' | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial config load from server or local cache
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setSyncStatus('syncing');
        const res = await fetch('/api/shurufa/config', {
          headers: {
            Authorization: `Bearer ${initialConfig.account.token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setConfig(json.data);
            setSyncStatus('synced');
            console.log('[GY Config Center] Cloud config loaded:', json.data);
          }
        } else {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.warn('[GY Config Center] Offline mode active, using local state fallback');
        setSyncStatus('offline');
      }
    };

    fetchConfig();
  }, []);

  // Sync handler (PUT /api/shurufa/config)
  const handleSyncConfig = async (updatedConfig?: GYConfig) => {
    const targetConfig = updatedConfig || config;
    setSyncStatus('syncing');

    try {
      const res = await fetch('/api/shurufa/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${targetConfig.account.token}`,
        },
        body: JSON.stringify({
          config: targetConfig,
          baseRevision: targetConfig.revision,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setConfig(json.data);
        setSyncStatus('synced');

        // Log new sync action
        const newLog: SyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          deviceName: 'ThinkPad X1 Carbon',
          action: '用户手动全量增量同步',
          revisionBefore: targetConfig.revision,
          revisionAfter: json.revision,
          status: 'success',
          details: '配置修改与词库列表成功同步至云端',
        };
        setSyncLogs([newLog, ...syncLogs]);
        showToast(`配置同步成功！全局 Revision 已更新至 rev-${json.revision}`, 'success');
      } else if (res.status === 409) {
        setSyncStatus('conflict');
        showToast('检测到其他设备提交了更近更新，请前往同步中心核对版本', 'error');
      } else {
        setSyncStatus('offline');
        showToast('云端网关暂时不可用，已保留本地配置更新', 'info');
      }
    } catch (err) {
      setSyncStatus('offline');
      showToast('网络断开，开启本地离线保护模式', 'info');
    }
  };

  // Local update config state
  const handleUpdateConfig = (partial: Partial<GYConfig>) => {
    const updated = {
      ...config,
      ...partial,
    };
    setConfig(updated);
    showToast('配置已本地生效', 'success');
  };

  // Logout handler
  const handleLogout = () => {
    showToast('已登出当前 GyenBox 会话，重定向至 GyenBox 统一通行证...', 'info');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased selection:bg-[#3b82f6] selection:text-white flex flex-col">
      {/* Top Bar Header */}
      <Header
        config={config}
        syncStatus={syncStatus}
        onManualSync={() => handleSyncConfig()}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          wordCount={words.length}
          deviceCount={devices.length}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
          {activeSection === 'overview' && (
            <OverviewSection
              config={config}
              devices={devices}
              syncLogs={syncLogs}
              syncStatus={syncStatus}
              wordCount={words.length}
              onManualSync={() => handleSyncConfig()}
              onNavigateSection={setActiveSection}
              onOpenExportModal={() => setImportExportMode('export')}
              onOpenImportModal={() => setImportExportMode('import')}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsSection
              config={config}
              onUpdateConfig={handleUpdateConfig}
              onShowToast={showToast}
            />
          )}

          {activeSection === 'learning' && (
            <LearningSection
              words={words}
              onUpdateWords={setWords}
              onShowToast={showToast}
            />
          )}

          {activeSection === 'devices' && (
            <DevicesSection
              devices={devices}
              onUpdateDevices={setDevices}
              onShowToast={showToast}
            />
          )}

          {activeSection === 'sync' && (
            <SyncCenterSection
              currentRevision={config.revision}
              syncLogs={syncLogs}
              onTriggerConflict={() => {
                setSyncStatus('conflict');
                showToast('已模拟生成版本冲突示例，请选择裁决方案', 'info');
              }}
              onShowToast={showToast}
            />
          )}

          {activeSection === 'changelog' && <ChangelogSection />}
        </main>
      </div>

      {/* Import / Export JSON Modal */}
      <ImportExportModal
        mode={importExportMode}
        config={config}
        onClose={() => setImportExportMode(null)}
        onImportConfig={(parsed) => {
          setConfig(parsed);
          handleSyncConfig(parsed);
        }}
        onShowToast={showToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
