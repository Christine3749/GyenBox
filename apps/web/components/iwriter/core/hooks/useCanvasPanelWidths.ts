/**
 * Measured from the native macOS reference at Retina scale.  The library owns
 * an 8px outer breathing edge, leaving a 234px visible card; the document list
 * is 231px.  Keeping these values explicit prevents the three-pane header from
 * slowly drifting as controls are refined.
 */
export const CANVAS_PANEL_WIDTHS = Object.freeze({
  libW: 242,
  doclistW: 231,
});

export function useCanvasPanelWidths() {
  return CANVAS_PANEL_WIDTHS;
}
