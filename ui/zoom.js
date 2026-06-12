/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/zoom.js - ズーム表示・操作 */

function updateZoomDisplay(zoom) { els.zoomInput.value = Math.round(zoom * 100); }

function onZoomInputChange() {
    const val = parseInt(els.zoomInput.value, 10);
    if (isNaN(val) || val < 10) { els.zoomInput.value = 10; CanvasManager.setZoom(0.1); }
    else if (val > 800) { els.zoomInput.value = 800; CanvasManager.setZoom(8.0); }
    else CanvasManager.setZoom(val / 100);
  }
