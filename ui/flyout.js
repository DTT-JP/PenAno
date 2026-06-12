/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/flyout.js - フライアウトパネル開閉 */

export const FLYOUTS = { zoom: {}, progress: {}, objects: {}, other: {} };

export let _activeFlyout = null;

export function initFlyouts() {
    FLYOUTS.zoom     = { panel: document.getElementById('flyoutZoom'),     btn: document.getElementById('btnZoomPanel') };
    FLYOUTS.progress = { panel: document.getElementById('flyoutProgress'), btn: document.getElementById('btnProgress') };
    FLYOUTS.objects  = { panel: document.getElementById('flyoutObjects'),  btn: document.getElementById('btnObjPanel') };
    FLYOUTS.other    = { panel: document.getElementById('flyoutOther'),    btn: document.getElementById('btnOtherMenu') };
  }

export function openFlyout(name) {
    const flyoutOverlay = document.getElementById('flyoutOverlay');
    if (_activeFlyout === name) { closeFlyout(); return; }
    closeFlyout(false);
    _activeFlyout = name;
    FLYOUTS[name].panel.classList.add('open');
    FLYOUTS[name].btn.classList.add('open');
    flyoutOverlay.classList.add('open');
  }

export function closeFlyout(resetOverlay = true) {
    const flyoutOverlay = document.getElementById('flyoutOverlay');
    if (_activeFlyout) {
      FLYOUTS[_activeFlyout].panel.classList.remove('open');
      FLYOUTS[_activeFlyout].btn.classList.remove('open');
      _activeFlyout = null;
    }
    if (resetOverlay) flyoutOverlay.classList.remove('open');
  }