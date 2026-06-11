/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * app.js – メインアプリケーションロジック
 */
(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────
  let _labels = [];
  let _labelColors = {};
  let _activeLabel = null;

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
      progressDrawer:  $('progressDrawer'),
      progressMini:    $('progressMini'),

      btnZoomReset:    $('btnZoomReset'),
      btnZoomCenter:   $('btnZoomCenter'),
      btnZoomPanel:    $('btnZoomPanel'),
      zoomDrawer:      $('zoomDrawer'),

      labelList:       $('labelList'),
      btnObjPanel:     $('btnObjPanel'),
      btnAddLabel:     $('btnAddLabel'),
      addLabelForm:    $('addLabelForm'),
      newLabelInput:   $('newLabelInput'),
      newLabelColor:   $('newLabelColor'),
      btnConfirmAddLabel: $('btnConfirmAddLabel'),
      btnCancelAddLabel:  $('btnCancelAddLabel'),

      btnMenuOpen:     $('btnMenuOpen'),

      canvasArea:      $('canvasArea'),
      canvasWrapper:   $('canvasWrapper'),
      mainCanvas:      $('mainCanvas'),
      annotSvg:        $('annotSvg'),

      flyoutOverlay:   $('flyoutOverlay'),
      flyoutObjects:   $('flyoutObjects'),

      btnZoomOut:      $('btnZoomOut'),
      btnZoomIn:       $('btnZoomIn'),
      zoomInput:       $('zoomInput'),
      btnZoomReset2:   $('btnZoomReset2'),
      btnZoomCenter2:  $('btnZoomCenter2'),

      statCurrent:     $('statCurrent'),
      statTotal:       $('statTotal'),
      statDone:        $('statDone'),
      statLeft:        $('statLeft'),

      objCount:        $('objCount'),
      objectList:      $('objectList'),

      btnDownloadZip:  $('btnDownloadZip'),
      btnReload:       $('btnReload'),
      btnVersionInfo:  $('btnVersionInfo'),

      modalMenu:       $('modalMenu'),
      btnCloseMenu:    $('btnCloseMenu'),

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

  // ─── Flyout System ─────────────────────────────────────────
  const FLYOUTS = { objects: {} };
  const SIDEBAR_DRAWERS = { zoom: {}, progress: {} };
  let _activeFlyout = null;
  let _activeSidebarDrawer = null;

  function initFlyouts() {
    FLYOUTS.objects  = { panel: els.flyoutObjects,  btn: els.btnObjPanel };
    SIDEBAR_DRAWERS.zoom = { panel: els.zoomDrawer, btn: els.btnZoomPanel };
    SIDEBAR_DRAWERS.progress = { panel: els.progressDrawer, btn: els.btnProgress };
  }

  function openFlyout(name) {
    if (!FLYOUTS[name]) return;
    if (_activeFlyout === name) { closeFlyout(); return; }
    closeSidebarDrawer();
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

  function toggleSidebarDrawer(name, forceOpen) {
    if (!SIDEBAR_DRAWERS[name]) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : _activeSidebarDrawer !== name;
    closeFlyout();
    closeSidebarDrawer();
    if (!shouldOpen) return;
    _activeSidebarDrawer = name;
    SIDEBAR_DRAWERS[name].panel.classList.add('open');
    SIDEBAR_DRAWERS[name].panel.setAttribute('aria-hidden', 'false');
    SIDEBAR_DRAWERS[name].btn.classList.add('open');
  }

  function closeSidebarDrawer() {
    if (!_activeSidebarDrawer) return;
    const drawer = SIDEBAR_DRAWERS[_activeSidebarDrawer];
    drawer.panel.classList.remove('open');
    drawer.panel.setAttribute('aria-hidden', 'true');
    drawer.btn.classList.remove('open');
    _activeSidebarDrawer = null;
  }

  // ─── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    initFlyouts();

    els.btnLoadFolder.addEventListener('click', () => els.fileInputFolder.click());
    els.btnLoadZip.addEventListener('click', () => els.fileInputZip.click());
    els.fileInputFolder.addEventListener('change', onFolderSelected);
    els.fileInputZip.addEventListener('change', onZipSelected);

    els.btnLoadVersionInfo.addEventListener('click', () => showVersionModal());
    els.loadVersionText.addEventListener('click', () => showVersionModal());

    els.btnPrev.addEventListener('click', () => { if (DataManager.prev()) showCurrentImage(); });
    els.btnNext.addEventListener('click', () => { if (DataManager.next()) showCurrentImage(); });

    els.btnConfirm.addEventListener('click', toggleConfirm);
    els.btnModeSelect.addEventListener('click', () => setMode('select'));
    els.btnModeAdd.addEventListener('click', () => setMode('add'));

    els.btnZoomReset.addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
    els.btnZoomCenter.addEventListener('click', () => CanvasManager.centerImage());

    els.btnZoomPanel.addEventListener('click', () => toggleSidebarDrawer('zoom'));
    els.btnProgress.addEventListener('click', () => { updateProgressStats(); toggleSidebarDrawer('progress'); });
    els.btnObjPanel.addEventListener('click', () => openFlyout('objects'));
    els.btnMenuOpen.addEventListener('click', () => openMenuModal());

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

    bindSidebarDrawerSwipe();

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
    els.btnReload.addEventListener('click', () => { closeFlyout(); showLoadScreen(); });
    els.btnVersionInfo.addEventListener('click', () => { closeFlyout(); showVersionModal(); });

    bindMenuModal();

    els.btnCloseModal.addEventListener('click', closeVersionModal);
    els.modalVersion.addEventListener('click', e => { if (e.target === els.modalVersion) closeVersionModal(); });

    try { initSettings(getAppCallbacks()); } catch(e) { console.error('initSettings:', e); }
  }


  // ─── Menu Modal ───────────────────────────────────────────
  function bindMenuModal() {
    els.btnCloseMenu.addEventListener('click', closeMenuModal);
    els.modalMenu.addEventListener('click', e => {
      if (e.target === els.modalMenu) closeMenuModal();
    });
    els.modalMenu.querySelectorAll('.menu-nav-btn[data-menu-section]').forEach(btn => {
      btn.addEventListener('click', () => switchMenuSection(btn.dataset.menuSection));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && els.modalMenu.classList.contains('open')) {
        closeMenuModal();
      }
    });
  }

  function openMenuModal(section = 'data') {
    closeFlyout();
    closeSidebarDrawer();
    closeVersionModal();
    switchMenuSection(section);
    els.modalMenu.classList.add('open');
    els.modalMenu.setAttribute('aria-hidden', 'false');
    els.btnMenuOpen.classList.add('open');
  }

  function closeMenuModal() {
    els.modalMenu.classList.remove('open');
    els.modalMenu.setAttribute('aria-hidden', 'true');
    els.btnMenuOpen.classList.remove('open');
  }

  function switchMenuSection(name) {
    const targetName = name || 'data';
    const targetPanel = els.modalMenu.querySelector(`[data-menu-panel="${targetName}"]`);
    if (!targetPanel) return;

    els.modalMenu.querySelectorAll('.menu-nav-btn[data-menu-section]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.menuSection === targetName);
    });
    els.modalMenu.querySelectorAll('.menu-section[data-menu-panel]').forEach(section => {
      section.classList.toggle('active', section === targetPanel);
    });
  }

  function bindSidebarDrawerSwipe() {
    const EDGE_GUARD_PX = 24;
    const OPEN_DISTANCE_PX = 48;
    const MAX_VERTICAL_DRIFT_PX = 34;
    document.querySelectorAll('[data-sidebar-drawer]').forEach(row => {
      let startX = 0;
      let startY = 0;
      let tracking = false;
      row.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        if (touch.clientX <= EDGE_GUARD_PX) return;
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
      }, { passive: true });
      row.addEventListener('touchmove', e => {
        if (!tracking || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dy) > MAX_VERTICAL_DRIFT_PX) {
          tracking = false;
          return;
        }
        if (Math.abs(dx) < OPEN_DISTANCE_PX) return;
        toggleSidebarDrawer(row.dataset.sidebarDrawer, dx > 0);
        tracking = false;
      }, { passive: true });
      row.addEventListener('touchend', () => { tracking = false; }, { passive: true });
      row.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
    });
  }

  /** settings.js に渡すコールバック群 */
  function getAppCallbacks() {
    return {
      getCurrentSessionId: () => DataManager.getSessionId(),
      getLabelColors: () => _labelColors,
      reloadLabelColors: () => {
        const sid = DataManager.getSessionId();
        if (!sid) return;
        _labelColors = Storage.getLabelColors(sid);
        CanvasManager.setLabelColors(_labelColors);
        renderLabelList();
      },
    };
  }

  // ─── File Loading ──────────────────────────────────────────
  async function onFolderSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    closeVersionModal();
    showProgress();
    try {
      await DataManager.loadFromFileList(files, updateProgress);
      onDataLoaded();
    } catch (err) {
      console.error(err);
      alert('ファイルの読み込みに失敗しました。');
      hideProgress();
    }
    e.target.value = '';
  }

  async function onZipSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    closeVersionModal();
    showProgress();
    try {
      await DataManager.loadFromZip(file, updateProgress);
      onDataLoaded();
    } catch (err) {
      console.error(err);
      alert('ZIPファイルの読み込みに失敗しました。');
      hideProgress();
    }
    e.target.value = '';
  }

  function showProgress() {
    els.loadProgress.classList.remove('hidden');
    els.progressFill.style.width = '0%';
    els.progressText.textContent = '読み込み中...';
  }
  function updateProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    els.progressFill.style.width = pct + '%';
    els.progressText.textContent = `読み込み中... ${done} / ${total}`;
  }
  function hideProgress() { els.loadProgress.classList.add('hidden'); }

  function onDataLoaded() {
    if (DataManager.count() === 0) {
      alert('画像ファイルが見つかりませんでした。');
      hideProgress();
      return;
    }
    initLabels();
    els.loadScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    setMode('select');
    showCurrentImage();
  }

  // ─── Labels ────────────────────────────────────────────────
  function initLabels() {
    const sid = DataManager.getSessionId();
    const fromData = DataManager.collectAllLabels();
    const storedColors = sid ? Storage.getLabelColors(sid) : {};
    const fromStorage = Object.keys(storedColors);
    const labelSet = new Set([...fromData, ...fromStorage]);
    _labels = [...labelSet].sort();
    _labelColors = {};
    for (const label of _labels) {
      _labelColors[label] = sid
        ? Storage.getOrAssignColor(sid, label)
        : '#2563eb';
    }
    _activeLabel = _labels.length > 0 ? _labels[0] : null;
  }

  function renderLabelList() {
    els.labelList.innerHTML = '';
    for (const label of _labels) {
      const color = _labelColors[label] || '#2563eb';
      const isActive = label === _activeLabel;
      const item = document.createElement('div');
      item.className = 'label-item' + (isActive ? ' active-label' : '');
      item.dataset.label = label;

      const swatch = document.createElement('label');
      swatch.className = 'label-swatch';
      swatch.style.background = color;
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'label-swatch-input';
      colorInput.value = color;
      colorInput.addEventListener('input', e => {
        e.stopPropagation();
        const newColor = e.target.value;
        swatch.style.background = newColor;
        _labelColors[label] = newColor;
        const sid = DataManager.getSessionId();
        if (sid) Storage.setLabelColor(sid, label, newColor);
        CanvasManager.setLabelColors(_labelColors);
      });
      colorInput.addEventListener('click', e => e.stopPropagation());
      swatch.appendChild(colorInput);

      const name = document.createElement('span');
      name.className = 'label-name';
      name.textContent = label;

      const del = document.createElement('button');
      del.className = 'label-del';
      del.textContent = '×';
      del.addEventListener('click', e => { e.stopPropagation(); deleteLabel(label); });

      item.appendChild(swatch);
      item.appendChild(name);
      item.appendChild(del);
      item.addEventListener('click', () => onLabelItemClick(label));
      els.labelList.appendChild(item);
    }
  }

  function onLabelItemClick(label) {
    _activeLabel = label;
    const mode = CanvasManager.getMode();
    const selIdx = CanvasManager.getSelectedIdx();
    if (mode === 'select' && selIdx >= 0) {
      const file = DataManager.current();
      if (file) {
        const shapes = DataManager.getShapes(file);
        if (shapes[selIdx]) {
          shapes[selIdx].label = label;
          DataManager.updateShape(file, selIdx, shapes[selIdx]);
          CanvasManager.setShapes(shapes, _labelColors);
          renderObjectList(shapes);
        }
      }
    }
    renderLabelList();
  }

  function onAddLabel() {
    const name = els.newLabelInput.value.trim();
    if (!name) return;
    if (_labels.includes(name)) { alert('このラベルは既に存在します。'); return; }
    const color = els.newLabelColor.value || '#2563eb';
    _labels.push(name);
    _labels.sort();
    _labelColors[name] = color;
    const sid = DataManager.getSessionId();
    if (sid) Storage.setLabelColor(sid, name, color);
    _activeLabel = name;
    els.newLabelInput.value = '';
    els.addLabelForm.classList.add('hidden');
    renderLabelList();
    CanvasManager.setLabelColors(_labelColors);
  }

  function deleteLabel(label) {
    if (!confirm(`ラベル「${label}」を削除しますか？\nこのラベルを持つ全てのオブジェクトも削除されます。`)) return;
    const sid = DataManager.getSessionId();
    for (const file of DataManager.files) {
      if (!file.json || !file.json.shapes) continue;
      const oldLen = file.json.shapes.length;
      file.json.shapes = file.json.shapes.filter(s => s.label !== label);
      if (file.json.shapes.length !== oldLen) {
        file.modified = true;
        if (sid) Storage.saveJson(sid, file.name, file.json);
      }
    }
    _labels = _labels.filter(l => l !== label);
    delete _labelColors[label];
    if (sid) Storage.removeLabelColor(sid, label);
    if (_activeLabel === label) _activeLabel = _labels.length > 0 ? _labels[0] : null;
    renderLabelList();
    const file = DataManager.current();
    if (file) {
      const shapes = DataManager.getShapes(file);
      CanvasManager.setShapes(shapes, _labelColors);
      renderObjectList(shapes);
    }
  }

  // ─── Object List ───────────────────────────────────────────
  function renderObjectList(shapes) {
    els.objectList.innerHTML = '';
    els.objCount.textContent = shapes ? shapes.length : 0;
    if (!shapes) return;
    const selectedIdx = CanvasManager.getSelectedIdx();
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      const color = _labelColors[shape.label] || '#2563eb';
      const item = document.createElement('div');
      item.className = 'obj-item' + (i === selectedIdx ? ' selected' : '');
      const swatch = document.createElement('span');
      swatch.className = 'obj-swatch';
      swatch.style.background = color;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'obj-label';
      labelSpan.textContent = shape.label;
      const idxSpan = document.createElement('span');
      idxSpan.className = 'obj-idx';
      idxSpan.textContent = '#' + i;
      const del = document.createElement('button');
      del.className = 'obj-del';
      del.textContent = '×';
      del.addEventListener('click', e => { e.stopPropagation(); deleteObject(i); });
      item.addEventListener('click', () => { CanvasManager.setSelectedIdx(i); renderObjectList(shapes); });
      item.appendChild(swatch); item.appendChild(labelSpan); item.appendChild(idxSpan); item.appendChild(del);
      els.objectList.appendChild(item);
    }
  }

  function deleteObject(idx) {
    const file = DataManager.current();
    if (!file) return;
    DataManager.removeShape(file, idx);
    const shapes = DataManager.getShapes(file);
    CanvasManager.setShapes(shapes, _labelColors);
    renderObjectList(shapes);
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

  // ─── Progress ──────────────────────────────────────────────
  function updateProgressStats() {
    const total = DataManager.count();
    const sid = DataManager.getSessionId();
    const confirmed = sid ? Storage.getConfirmed(sid) : new Set();
    let doneCount = 0;
    for (const file of DataManager.files) {
      if (confirmed.has(file.name)) doneCount++;
    }
    const current = total > 0 ? DataManager.index() + 1 : 0;
    els.statCurrent.textContent = current;
    els.statTotal.textContent = total;
    els.statDone.textContent = doneCount;
    els.statLeft.textContent = total - doneCount;
    els.progressMini.textContent = `${doneCount}/${total}`;
  }

  // ─── Confirm ───────────────────────────────────────────────
  function toggleConfirm() {
    const file = DataManager.current();
    if (!file) return;
    const sid = DataManager.getSessionId();
    if (!sid) return;
    Storage.setConfirmed(sid, file.name, !Storage.isConfirmed(sid, file.name));
    updateConfirmButton(file.name, sid);
    updateProgressStats();
  }

  function updateConfirmButton(filename, sid) {
    const confirmed = sid ? Storage.isConfirmed(sid, filename) : false;
    if (confirmed) {
      els.btnConfirm.classList.add('confirmed');
      els.confirmLabel.textContent = '確認済';
    } else {
      els.btnConfirm.classList.remove('confirmed');
      els.confirmLabel.textContent = '確認';
    }
  }

  // ─── Zoom ──────────────────────────────────────────────────
  function updateZoomDisplay(zoom) { els.zoomInput.value = Math.round(zoom * 100); }
  function onZoomInputChange() {
    const val = parseInt(els.zoomInput.value, 10);
    if (isNaN(val) || val < 10) { els.zoomInput.value = 10; CanvasManager.setZoom(0.1); }
    else if (val > 800) { els.zoomInput.value = 800; CanvasManager.setZoom(8.0); }
    else CanvasManager.setZoom(val / 100);
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
        CanvasManager.setJustAdded(true);
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
      els.mdOlderLinkAnchor.href = ver.githubRepo + '/blob/main/doc/CHANGELOG.md';
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

  // ─── Reload ────────────────────────────────────────────────
  function showLoadScreen() {
    els.app.classList.add('hidden');
    els.loadScreen.classList.remove('hidden');
    els.loadProgress.classList.add('hidden');
    els.fileInputFolder.value = '';
    els.fileInputZip.value = '';
  }

})();