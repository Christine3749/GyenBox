import { useSyncExternalStore } from 'react';

export type ShellPlatform = 'mac' | 'windows' | 'web';

export interface ShellPlatformInfo {
  isElectron: boolean;
  isMac: boolean;
  isWeb: boolean;
  isWindows: boolean;
  platform: ShellPlatform;
  rawPlatform?: string;
}

const WEB_PLATFORM: ShellPlatformInfo = {
  isElectron: false,
  isMac: false,
  isWeb: true,
  isWindows: false,
  platform: 'web',
};

const MAC_PLATFORM: ShellPlatformInfo = {
  isElectron: true,
  isMac: true,
  isWeb: false,
  isWindows: false,
  platform: 'mac',
  rawPlatform: 'darwin',
};

const WINDOWS_PLATFORM: ShellPlatformInfo = {
  isElectron: true,
  isMac: false,
  isWeb: false,
  isWindows: true,
  platform: 'windows',
  rawPlatform: 'win32',
};

export function getShellPlatform(): ShellPlatformInfo {
  const api = typeof window === 'undefined' ? undefined : (window as any).electronAPI;
  const rawPlatform = api?.platform as string | undefined;
  if (api?.isElectron && rawPlatform === 'darwin') return MAC_PLATFORM;
  if (api?.isElectron && rawPlatform === 'win32') return WINDOWS_PLATFORM;
  return WEB_PLATFORM;
}

const subscribe = () => () => {};

export function useShellPlatform() {
  // The server snapshot is always web; React rechecks the stable client snapshot
  // after hydration, when Electron's preload bridge is available.
  return useSyncExternalStore(subscribe, getShellPlatform, () => WEB_PLATFORM);
}
