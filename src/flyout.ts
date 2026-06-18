/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * flyout.ts – フライアウトパネルの開閉管理 + 設定モーダルの開閉管理
 *
 * - zoom / progress / objects は従来通り flyoutOverlay を使ったスライドインパネル
 * - 設定（other）は独立した settingsModalOverlay を使った中央ポップアップ
 */

interface FlyoutEntry {
  panel: HTMLElement;
  btn: HTMLElement;
}

const FLYOUTS: Record<string, FlyoutEntry> = {};
let _activeFlyout: string | null = null;

function $el(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

// ─── Flyout（スライドインパネル） ─────────────────────────────────────────────

export function initFlyouts(): void {
  FLYOUTS.zoom     = { panel: $el('flyoutZoom'),     btn: $el('btnZoomPanel') };
  FLYOUTS.progress = { panel: $el('flyoutProgress'), btn: $el('btnProgress') };
  FLYOUTS.objects  = { panel: $el('flyoutObjects'),  btn: $el('btnObjPanel') };

  // 設定モーダルのオーバーレイクリックで閉じる
  $el('settingsModalOverlay').addEventListener('click', (e) => {
    if (e.target === $el('settingsModalOverlay')) closeSettings();
  });

  // data-close-settings 属性のボタンで閉じる
  document.querySelectorAll<HTMLElement>('[data-close-settings]').forEach(btn => {
    btn.addEventListener('click', () => closeSettings());
  });
}

export function openFlyout(name: string): void {
  if (_activeFlyout === name) { closeFlyout(); return; }
  closeFlyout(false);
  _activeFlyout = name;
  FLYOUTS[name].panel.classList.add('open');
  FLYOUTS[name].btn.classList.add('open');
  $el('flyoutOverlay').classList.add('open');
}

export function closeFlyout(resetOverlay = true): void {
  if (_activeFlyout) {
    FLYOUTS[_activeFlyout].panel.classList.remove('open');
    FLYOUTS[_activeFlyout].btn.classList.remove('open');
    _activeFlyout = null;
  }
  if (resetOverlay) $el('flyoutOverlay').classList.remove('open');
}

// ─── 設定モーダル（中央ポップアップ） ─────────────────────────────────────────

export function openSettings(): void {
  $el('settingsModalOverlay').classList.add('open');
  $el('btnOtherMenu').classList.add('open');
}

export function closeSettings(): void {
  $el('settingsModalOverlay').classList.remove('open');
  $el('btnOtherMenu').classList.remove('open');
}