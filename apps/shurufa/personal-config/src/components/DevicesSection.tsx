import React from 'react';
import { GYDevice } from '../types';
import {
  Laptop,
  Monitor,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Clock,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface DevicesSectionProps {
  devices: GYDevice[];
  onUpdateDevices: (updated: GYDevice[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DevicesSection: React.FC<DevicesSectionProps> = ({
  devices,
  onUpdateDevices,
  onShowToast,
}) => {

  const handleSyncDevice = (id: string) => {
    const target = devices.find((d) => d.id === id);
    onShowToast(`正在与设备「${target?.name.split(' ')[0]}」同步最新配置...`, 'info');
    setTimeout(() => {
      const updated = devices.map((d) =>
        d.id === id ? { ...d, syncStatus: 'synced' as const, lastOnlineAt: '刚刚在线' } : d
      );
      onUpdateDevices(updated);
      onShowToast(`设备「${target?.name.split(' ')[0]}」配置同步完成`, 'success');
    }, 600);
  };

  const handleSetCurrent = (id: string) => {
    const updated = devices.map((d) => ({
      ...d,
      isCurrent: d.id === id,
    }));
    onUpdateDevices(updated);
    const target = devices.find((d) => d.id === id);
    onShowToast(`已将「${target?.name.split(' ')[0]}」标记为当前默认本机`, 'success');
  };

  const handleRemoveDevice = (id: string) => {
    const target = devices.find((d) => d.id === id);
    if (target?.isCurrent) {
      onShowToast('无法解除绑定当前正在使用的默认本机', 'error');
      return;
    }
    const updated = devices.filter((d) => d.id !== id);
    onUpdateDevices(updated);
    onShowToast(`已移除设备「${target?.name.split(' ')[0]}」`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#fafafa] flex items-center gap-2">
            <Laptop className="w-5 h-5 text-[#3b82f6]" />
            已绑定的 GY 输入法设备中心
          </h2>
          <p className="text-xs text-[#71717a] mt-1">
            当前 GyenBox 账号共绑定 {devices.length} 台设备。任何一台设备修改配置或产生词频，均可安全云端同步。
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#71717a] font-mono bg-[#09090b] px-3 py-1.5 rounded-lg border border-[#27272a]">
          <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
          <span>设备安全鉴权已就绪</span>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          return (
            <div
              key={device.id}
              className={`rounded-xl border p-5 space-y-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                device.isCurrent
                  ? 'bg-[#18181b] border-[#3b82f6] shadow-lg ring-1 ring-[#3b82f6]'
                  : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              {/* Header Badge */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                        device.os === 'macOS'
                          ? 'bg-[#09090b] text-slate-200 border border-[#27272a]'
                          : 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30'
                      }`}
                    >
                      {device.os === 'macOS' ? <Monitor className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 leading-snug">
                        {device.name}
                      </h3>
                      <p className="text-[10px] text-[#71717a] font-mono">
                        {device.os} · {device.osVersion}
                      </p>
                    </div>
                  </div>

                  {device.isCurrent && (
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#3b82f6] text-white">
                      当前本机
                    </span>
                  )}
                </div>

                {/* Details list */}
                <div className="bg-[#09090b] rounded-lg p-3 border border-[#27272a] text-xs space-y-2 font-mono">
                  <div className="flex justify-between items-center text-[#71717a]">
                    <span>输入法内核版本:</span>
                    <span className="text-slate-200 font-semibold">{device.inputVersion}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#71717a]">
                    <span>同步版本号 (Rev):</span>
                    <span className="text-[#3b82f6] font-semibold">rev-{device.revision}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#71717a]">
                    <span>最后在线时间:</span>
                    <span className="text-slate-300">{device.lastOnlineAt}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-[#27272a] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleSyncDevice(device.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#27272a] hover:bg-[#27272a] text-slate-200 text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#3b82f6]" />
                  立即同步
                </button>

                <div className="flex items-center gap-1">
                  {!device.isCurrent && (
                    <button
                      onClick={() => handleSetCurrent(device.id)}
                      className="px-2.5 py-1.5 rounded bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 text-[#3b82f6] text-xs font-medium transition-colors"
                    >
                      设为当前
                    </button>
                  )}

                  {!device.isCurrent && (
                    <button
                      onClick={() => handleRemoveDevice(device.id)}
                      className="p-1.5 text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      title="解绑设备"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
