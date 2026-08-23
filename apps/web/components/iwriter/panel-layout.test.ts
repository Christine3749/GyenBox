import { describe, expect, it } from 'vitest';

import { CANVAS_PANEL_WIDTHS } from './core/hooks/useCanvasPanelWidths';

describe('iWriter three-panel geometry', () => {
  it('reserves the measured library card and its breathing edge', () => {
    expect(CANVAS_PANEL_WIDTHS.libW).toBe(242);
    expect(CANVAS_PANEL_WIDTHS.libW - 8).toBe(234);
  });

  it('keeps the document list balanced with the visible library card', () => {
    expect(CANVAS_PANEL_WIDTHS.doclistW).toBe(231);
    expect(CANVAS_PANEL_WIDTHS.libW + CANVAS_PANEL_WIDTHS.doclistW).toBe(473);
  });
});
