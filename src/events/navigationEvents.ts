/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * events/navigationEvents.ts – ファイルナビ・モード切替・確認ボタン・サイドバーズーム
 */
import DataManager from '../data';
import CanvasManager from '../canvas';
import { showCurrentImage } from '../imageNav';
import { toggleConfirm } from '../ui/confirm';
import { updateZoomDisplay } from '../ui/zoom';
import type { AppMode } from '../types/app';

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

export function bindNavigationEvents(setMode: (m: AppMode) => void): void {
  // ファイルナビ
  $('btnPrev').addEventListener('click', () => {
    if (DataManager.prev()) showCurrentImage();
  });
  $('btnNext').addEventListener('click', () => {
    if (DataManager.next()) showCurrentImage();
  });

  // モード切替
  $('btnModeSelect').addEventListener('click', () => setMode('select'));
  $('btnModeAdd').addEventListener('click', () => setMode('add'));

  // 確認ボタン
  $('btnConfirm').addEventListener('click', () => toggleConfirm());

  // サイドバーズームショートカット
  $('btnZoomReset').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.resetZoom()));
  $('btnZoomCenter').addEventListener('click', () => CanvasManager.centerImage());
}