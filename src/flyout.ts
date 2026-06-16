/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * flyout.ts – フライアウトパネルの開閉管理
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

export function initFlyouts(): void {
  FLYOUTS.zoom     = { panel: $el('flyoutZoom'),     btn: $el('btnZoomPanel') };
  FLYOUTS.progress = { panel: $el('flyoutProgress'), btn: $el('btnProgress') };
  FLYOUTS.objects  = { panel: $el('flyoutObjects'),  btn: $el('btnObjPanel') };
  FLYOUTS.other    = { panel: $el('flyoutOther'),    btn: $el('btnOtherMenu') };
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