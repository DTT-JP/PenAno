/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/flyout.js - フライアウトパネル開閉 */

const FLYOUTS = { zoom: {}, progress: {}, objects: {}, other: {} };

let _activeFlyout = null;

function initFlyouts() {
    FLYOUTS.zoom     = { panel: els.flyoutZoom,     btn: els.btnZoomPanel };
    FLYOUTS.progress = { panel: els.flyoutProgress, btn: els.btnProgress };
    FLYOUTS.objects  = { panel: els.flyoutObjects,  btn: els.btnObjPanel };
    FLYOUTS.other    = { panel: els.flyoutOther,    btn: els.btnOtherMenu };
  }

function openFlyout(name) {
    if (_activeFlyout === name) { closeFlyout(); return; }
    closeFlyout(false);
    _activeFlyout = name;
    FLYOUTS[name].panel.classList.add('open');
    FLYOUTS[name].btn.classList.add('open');
    els.flyoutOverlay.classList.add('open');
  }

function closeFlyout(resetOverlay = true) {
    if (_activeFlyout) {
      FLYOUTS[_activeFlyout].panel.classList.remove('open');
      FLYOUTS[_activeFlyout].btn.classList.remove('open');
      _activeFlyout = null;
    }
    if (resetOverlay) els.flyoutOverlay.classList.remove('open');
  }
