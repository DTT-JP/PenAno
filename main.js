/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * main.js – メインアプリケーションロジック
 */

import {
  _labels, _labelColors, _activeLabel,
  setLabels, setLabelColors, setActiveLabel
} from './state.js';

import {
  onFolderSelected, onZipSelected, showProgress, updateProgress,
  hideProgress, onDataLoaded, showLoadScreen
} from './ui/loadScreen.js';

import {
  renderLabelList, onLabelItemClick, onAddLabel, deleteLabel
} from './ui/labelList.js';

import { renderObjectList, deleteObject } from './ui/objectList.js';

import {
  FLYOUTS, initFlyouts, openFlyout, closeFlyout
} from './ui/flyout.js';

import { updateZoomDisplay, onZoomInputChange } from './ui/zoom.js';

import { updateProgressStats } from './ui/progress.js';

import { toggleConfirm, updateConfirmButton } from './ui/confirm.js';

  // ─── DOM Refs ──────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  let els;

  // ─── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    els = {
      loadScreen:      $('loadScreen'),
      btnLoadFolder:   $('btnLoadFolder'),
      btnLoadZip:      $('btnLoadZip'),
      fileInputFolder: $('fileInputFolder'),
      fileInputZip:    $('fileInputZip'),
      loadProgress:    $('loadProgress'),
      progressFill:    $('progressFill'),
      progressText:    $('progressText'),
      loadVersionText: $('loadVersionText'),
      btnLoadVersionInfo: $('btnLoadVersionInfo'),

      app:             $('app'),

      btnPrev:         $('btnPrev'),
      btnNext:         $('btnNext'),
      fileName:        $('fileName'),
      fileCounter:     $('fileCounter'),

      btnConfirm:      $('btnConfirm'),
      confirmLabel:    $('confirmLabel'),
      btnModeSelect:   $('btnModeSelect'),
      btnModeAdd:      $('btnModeAdd'),
      btnProgress:     $('btnProgress'),

      btnZoomReset:    $('btnZoomReset'),
      btnZoomCenter:   $('btnZoomCenter'),
      btnZoomPanel:    $('btnZoomPanel'),

      labelList:       $('labelList'),
      btnObjPanel:     $('btnObjPanel'),
      btnAddLabel:     $('btnAddLabel'),
      addLabelForm:    $('addLabelForm'),
      newLabelInput:   $('newLabelInput'),
      newLabelColor:   $('newLabelColor'),
      btnConfirmAddLabel: $('btnConfirmAddLabel'),
      btnCancelAddLabel:  $('btnCancelAddLabel'),

      btnOtherMenu:    $('btnOtherMenu'),

      canvasArea:      $('canvasArea'),
      canvasWrapper:   $('canvasWrapper'),
      mainCanvas:      $('mainCanvas'),
      annotSvg:        $('annotSvg'),

      flyoutOverlay:   $('flyoutOverlay'),
      flyoutZoom:      $('flyoutZoom'),
      flyoutProgress:  $('flyoutProgress'),
      flyoutObjects:   $('flyoutObjects'),
      flyoutOther:     $('flyoutOther'),

      btnZoomOut:      $('btnZoomOut'),
      btnZoomIn:       $('btnZoomIn'),
      zoomInput:       $('zoomInput'),
      btnZoomReset2:   $('btnZoomReset2'),
      btnZoomCenter2:  $('btnZoomCenter2'),

      statTotal:       $('statTotal'),
      statDone:        $('statDone'),
      statLeft:        $('statLeft'),

      objCount:        $('objCount'),
      objectList:      $('objectList'),

      btnDownloadZip:  $('btnDownloadZip'),
      btnReload:       $('btnReload'),
      btnVersionInfo:  $('btnVersionInfo'),

      modalVersion:    $('modalVersion'),
      modalVersionTitle: $('modalVersionTitle'),
      mdContent:       $('mdContent'),
      mdOlderLink:     $('mdOlderLink'),
      mdOlderLinkAnchor: $('mdOlderLinkAnchor'),
      btnCloseModal:   $('btnCloseModal'),
    };

    CanvasManager.init(els.mainCanvas, els.annotSvg, els.canvasWrapper, els.canvasArea);
    CanvasManager.onShapesChanged(handleShapesChanged);

    if (typeof APP_VERSION !== 'undefined') {
      els.loadVersionText.textContent = 'v' + APP_VERSION.version;
    }

    bindEvents();
    registerServiceWorker();
  });

  // ─── PWA ───────────────────────────────────────────────────
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  // ─── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    initFlyouts();

    els.btnLoadFolder.addEventListener('click', () => els.fileInputFolder.click());
    els.btnLoadZip.addEventListener('click', () => els.fileInputZip.click());

    const loadScreenCallbacks = {
      els,
      closeVersionModal,
      initLabels,
      setMode,
      showCurrentImage,
    };

    els.fileInputFolder.addEventListener('change', e => onFolderSelected(e, loadScreenCallbacks));
    els.fileInputZip.addEventListener('change', e => onZipSelected(e, loadScreenCallbacks));

    els.btnLoadVersionInfo.addEventListener('click', () => showVersionModal());
    els.loadVersionText.addEventListener('click', () => showVersionModal());

    els.btnPrev.addEventListener('click', () => { if (DataManager.prev()) showCurrentImage(); });
    els.btnNext.addEventListener('click', () => { if (DataManager.next()) showCurrentImage(); });

    els.btnConfirm.addEventListener('click', () => toggleConfirm());
    els.btnModeSelect.addEventListener('click', () => setMode('select'));
    els.btnModeAdd.addEventListener('click', () => setMode('add'));

    els.btnZoomReset.addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
    els.btnZoomCenter.addEventListener('click', () => CanvasManager.centerImage());

    els.btnZoomPanel.addEventListener('click', () => openFlyout('zoom'));
    els.btnProgress.addEventListener('click', () => { updateProgressStats(); openFlyout('progress'); });
    els.btnObjPanel.addEventListener('click', () => openFlyout('objects'));
    els.btnOtherMenu.addEventListener('click', () => { openFlyout('other'); });

    els.flyoutOverlay.addEventListener('click', () => closeFlyout());
    document.querySelectorAll('[data-close-flyout]').forEach(btn => {
      btn.addEventListener('click', () => closeFlyout());
    });

    els.btnZoomIn.addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomIn()));
    els.btnZoomOut.addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomOut()));
    els.zoomInput.addEventListener('change', onZoomInputChange);
    els.zoomInput.addEventListener('blur', onZoomInputChange);
    els.btnZoomReset2.addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
    els.btnZoomCenter2.addEventListener('click', () => CanvasManager.centerImage());

    els.btnAddLabel.addEventListener('click', () => {
      els.addLabelForm.classList.toggle('hidden');
      if (!els.addLabelForm.classList.contains('hidden')) els.newLabelInput.focus();
    });
    els.btnConfirmAddLabel.addEventListener('click', onAddLabel);
    els.btnCancelAddLabel.addEventListener('click', () => {
      els.addLabelForm.classList.add('hidden');
      els.newLabelInput.value = '';
    });
    els.newLabelInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') onAddLabel();
      if (e.key === 'Escape') { els.addLabelForm.classList.add('hidden'); els.newLabelInput.value = ''; }
    });

    els.btnDownloadZip.addEventListener('click', () => { closeFlyout(); onDownloadZip(); });
    els.btnReload.addEventListener('click', () => { closeFlyout(); showLoadScreen(els); });
    els.btnVersionInfo.addEventListener('click', () => { closeFlyout(); showVersionModal(); });

    els.btnCloseModal.addEventListener('click', closeVersionModal);
    els.modalVersion.addEventListener('click', e => { if (e.target === els.modalVersion) closeVersionModal(); });

    try { initSettings(getAppCallbacks()); } catch(e) { console.error('initSettings:', e); }
  }

  /** settings.js に渡すコールバック群 */
  function getAppCallbacks() {
    return {
      getCurrentSessionId: () => DataManager.getSessionId(),
      getLabelColors: () => _labelColors,
      reloadLabelColors: () => {
        const sid = DataManager.getSessionId();
        if (!sid) return;
        setLabelColors(Storage.getLabelColors(sid));
        CanvasManager.setLabelColors(_labelColors);
        renderLabelList();
      },
    };
  }

  // ─── Labels ────────────────────────────────────────────────
  function initLabels() {
    const sid = DataManager.getSessionId();
    const fromData = DataManager.collectAllLabels();
    const storedColors = sid ? Storage.getLabelColors(sid) : {};
    const fromStorage = Object.keys(storedColors);
    const labelSet = new Set([...fromData, ...fromStorage]);
    setLabels([...labelSet].sort());
    setLabelColors({});
    for (const label of _labels) {
      _labelColors[label] = sid
        ? Storage.getOrAssignColor(sid, label)
        : '#2563eb';
    }
    setActiveLabel(_labels.length > 0 ? _labels[0] : null);
  }

  // ─── Show Current Image ────────────────────────────────────
  async function showCurrentImage() {
    const file = DataManager.current();
    if (!file) return;
    els.fileName.textContent = file.name;
    els.fileCounter.textContent = `${DataManager.index() + 1} / ${DataManager.count()}`;
    updateProgressStats();
    const sid = DataManager.getSessionId();
    updateConfirmButton(file.name, sid);
    try { await CanvasManager.loadImage(file.imageURL); } catch(err) { console.error(err); }
    const shapes = DataManager.getShapes(file);
    CanvasManager.setShapes(shapes, _labelColors);
    renderObjectList(shapes);
    renderLabelList();
    updateZoomDisplay(CanvasManager.getZoom());
  }

  // ─── Mode ──────────────────────────────────────────────────
  function setMode(mode) {
    CanvasManager.setMode(mode);
    els.btnModeSelect.classList.toggle('active', mode === 'select');
    els.btnModeAdd.classList.toggle('active', mode === 'add');
  }

  // ─── Canvas Callback ──────────────────────────────────────
  function handleShapesChanged(eventType, data) {
    const file = DataManager.current();
    if (!file) return;
    switch (eventType) {
      case 'select': {
        const shapes = DataManager.getShapes(file);
        renderObjectList(shapes);
        break;
      }
      case 'addShape': {
        const label = _activeLabel;
        if (!label) {
          alert('ラベルを選択してください。\nラベル一覧からラベルをタップして選択してください。');
          return;
        }
        const { w, h } = CanvasManager.getImageSize();
        const shape = DataManager.makeRectShape(label, data.x1, data.y1, data.x2, data.y2, w, h);
        const sid = DataManager.getSessionId();
        if (!_labels.includes(label)) {
          _labels.push(label);
          _labels.sort();
          _labelColors[label] = sid ? Storage.getOrAssignColor(sid, label) : '#2563eb';
          renderLabelList();
        }
        DataManager.addShape(file, shape);
        const shapes = DataManager.getShapes(file);
        CanvasManager.setShapes(shapes, _labelColors);
        CanvasManager.setSelectedIdx(shapes.length - 1);
        renderObjectList(shapes);
        break;
      }
      case 'shapeUpdated': {
        const shapes = DataManager.getShapes(file);
        if (data >= 0 && data < shapes.length) DataManager.updateShape(file, data, shapes[data]);
        break;
      }
      case 'zoom': {
        updateZoomDisplay(CanvasManager.getZoom());
        break;
      }
    }
  }

  // ─── Version Modal ─────────────────────────────────────────
  async function showVersionModal() {
    els.modalVersion.classList.add('open');
    const ver = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : null;
    if (!ver) { els.mdContent.innerHTML = '<p>バージョン情報が見つかりません。</p>'; return; }
    els.modalVersionTitle.textContent = `PenAno v${ver.version}`;
    els.mdContent.innerHTML = '<p style="color:var(--text2);">読み込み中...</p>';
    els.mdOlderLink.style.display = 'none';
    const docUrl = new URL(ver.docFile, document.baseURI).href + '?t=' + Date.now();
    try {
      const res = await fetch(docUrl);
      if (!res.ok) throw new Error('fetch failed: ' + res.status);
      const md = await res.text();
      els.mdContent.innerHTML = marked.parse(md);
      els.mdContent.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    } catch(e) {
      const isOffline = !navigator.onLine;
      els.mdContent.innerHTML = `<h1>PenAno v${ver.version}</h1><p style="color:var(--text2);">${isOffline ? 'オフラインのため、リリースノートを取得できませんでした。' : 'リリースノートを読み込めませんでした。'}</p>`;
    }
    if (ver.githubRepo) {
      els.mdOlderLink.style.display = 'block';
      els.mdOlderLinkAnchor.href = ver.githubRepo + '/blob/main/CHANGELOG.md';
    }
  }

  function closeVersionModal() { els.modalVersion.classList.remove('open'); }

  // ─── Download ZIP ──────────────────────────────────────────
  async function onDownloadZip() {
    const zip = new JSZip();
    let hasData = false;
    for (const file of DataManager.files) {
      if (file.json) {
        const base = file.name.replace(/\.[^.]+$/, '');
        zip.file(base + '.json', JSON.stringify(file.json, null, 2));
        hasData = true;
      }
    }
    if (!hasData) { alert('保存するデータがありません。'); return; }
    try {
      const content = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url; a.download = 'annotations.zip';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(err) { console.error(err); alert('ZIPの作成に失敗しました。'); }
  }