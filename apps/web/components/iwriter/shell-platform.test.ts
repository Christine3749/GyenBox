import { afterEach, describe, expect, it, vi } from 'vitest';
import { getShellPlatform } from './core/hooks/useShellPlatform';

describe('getShellPlatform', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('detects the macOS Electron preload bridge at runtime', () => {
    vi.stubGlobal('window', { electronAPI: { isElectron: true, platform: 'darwin' } });

    expect(getShellPlatform()).toMatchObject({
      isElectron: true,
      isMac: true,
      isWeb: false,
      platform: 'mac',
    });
  });

  it('falls back to web without the preload bridge', () => {
    vi.stubGlobal('window', {});

    expect(getShellPlatform()).toMatchObject({
      isElectron: false,
      isMac: false,
      isWeb: true,
      platform: 'web',
    });
  });
});
