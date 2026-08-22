import { describe, expect, it } from 'vitest';

import { MAC_TRAFFIC_LIGHT_INSET, getMacTitlebarInsets } from './core/components/CanvasEditorTypes';

describe('macOS titlebar safe area', () => {
  it('does not alter the editor chrome while the sidebar is closed', () => {
    expect(getMacTitlebarInsets(true, false, false)).toEqual({
      library: 0,
      chrome: 0,
    });
  });

  it('moves to the Library header while the sidebar is open', () => {
    expect(getMacTitlebarInsets(true, false, true)).toEqual({
      library: MAC_TRAFFIC_LIGHT_INSET,
      chrome: 0,
    });
  });

  it('is removed in native fullscreen', () => {
    expect(getMacTitlebarInsets(true, true, true)).toEqual({ library: 0, chrome: 0 });
    expect(getMacTitlebarInsets(true, true, false)).toEqual({ library: 0, chrome: 0 });
  });

  it('is never applied to web or Windows shells', () => {
    expect(getMacTitlebarInsets(false, false, true)).toEqual({ library: 0, chrome: 0 });
  });
});
