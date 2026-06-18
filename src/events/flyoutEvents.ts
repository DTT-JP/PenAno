/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * events/flyoutEvents.ts – フライアウトパネル・ズームパネルのイベントバインド
 */
import CanvasManager from '../canvas';
import { initFlyouts, openFlyout, closeFlyout, openSettings } from '../flyout';
import { updateProgressStats } from '../ui/progress';
import { updateZoomDisplay, onZoomInputChange } from '../ui/zoom';

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

export function bindFlyoutEvents(): void {
  initFlyouts();

  // フライアウト開閉トリガー
  $('btnZoomPanel').addEventListener('click', () => openFlyout('zoom'));
  $('btnProgress').addEventListener('click', () => {
    updateProgressStats();
    openFlyout('progress');
  });
  $('btnObjPanel').addEventListener('click', () => openFlyout('objects'));

  // 設定モーダル（中央ポップアップ）
  $('btnOtherMenu').addEventListener('click', () => openSettings());

  // オーバーレイ・閉じるボタン
  $('flyoutOverlay').addEventListener('click', () => closeFlyout());
  document.querySelectorAll<HTMLElement>('[data-close-flyout]').forEach(btn =>
    btn.addEventListener('click', () => closeFlyout()));
}

export function bindZoomPanelEvents(): void {
  $('btnZoomIn').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.zoomIn()));
  $('btnZoomOut').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.zoomOut()));
  $<HTMLInputElement>('zoomInput').addEventListener('change', onZoomInputChange);
  $<HTMLInputElement>('zoomInput').addEventListener('blur', onZoomInputChange);
  $('btnZoomReset2').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.resetZoom()));
  $('btnZoomCenter2').addEventListener('click', () => CanvasManager.centerImage());
}