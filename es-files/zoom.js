/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/zoom.js - ズーム表示・操作 */
import CanvasManager from '../canvas.js';

export function updateZoomDisplay(zoom) {
  const zoomInput = document.getElementById('zoomInput');
  if (zoomInput) zoomInput.value = Math.round(zoom * 100);
}

export function onZoomInputChange() {
  const zoomInput = document.getElementById('zoomInput');
  const val = parseInt(zoomInput.value, 10);
  if (isNaN(val) || val < 10) { zoomInput.value = 10; CanvasManager.setZoom(0.1); }
  else if (val > 800) { zoomInput.value = 800; CanvasManager.setZoom(8.0); }
  else CanvasManager.setZoom(val / 100);
}
