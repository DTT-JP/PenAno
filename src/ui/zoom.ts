/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/zoom.ts - ズーム表示・操作 */
import CanvasManager from '../canvas';

export function updateZoomDisplay(zoom: number): void {
  const zoomInput = document.getElementById('zoomInput') as HTMLInputElement | null;
  if (zoomInput) zoomInput.value = String(Math.round(zoom * 100));
}

export function onZoomInputChange(): void {
  const zoomInput = document.getElementById('zoomInput') as HTMLInputElement;
  const val = parseInt(zoomInput.value, 10);
  if (isNaN(val) || val < 10) { zoomInput.value = '10'; CanvasManager.setZoom(0.1); }
  else if (val > 800) { zoomInput.value = '800'; CanvasManager.setZoom(8.0); }
  else CanvasManager.setZoom(val / 100);
}