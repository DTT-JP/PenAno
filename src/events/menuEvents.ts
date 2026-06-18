/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * events/menuEvents.ts – 設定モーダル・バージョンモーダル・その他メニューのイベントバインド
 */
import { initSettings } from '../settings';
import { closeSettings } from '../flyout';
import { showVersionModal, closeVersionModal } from '../versionModal';
import { onDownloadZip } from '../downloadZip';
import type { AppCallbacks } from '../types/app';

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

export function bindMenuEvents(
  callbacks: AppCallbacks,
  onReload: () => void,
): void {
  // その他メニュー内アクション
  $('btnDownloadZip').addEventListener('click', () => {
    closeSettings();
    onDownloadZip();
  });
  $('btnReload').addEventListener('click', () => {
    closeSettings();
    onReload();
  });
  $('btnVersionInfo').addEventListener('click', () => {
    closeSettings();
    showVersionModal();
  });

  // バージョンモーダル
  $('btnCloseModal').addEventListener('click', closeVersionModal);
  $('modalVersion').addEventListener('click', (e: MouseEvent) => {
    if (e.target === $('modalVersion')) closeVersionModal();
  });

  // 設定パネル初期化
  try {
    initSettings(callbacks);
  } catch (e) {
    console.error('initSettings:', e);
  }
}