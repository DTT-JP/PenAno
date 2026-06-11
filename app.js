/**
 * app.js – メインアプリケーションロジック
 */
(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────
  let _labels = [];
  let _labelColors = {};
  let _activeLabel = null;   // 現在選択中のラベル（追加・変更用）

  // ─── DOM Refs ──────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  let els;

  // ─── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    els = {
      // Load screen
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

      // App
      app:             $('app'),

      // Sidebar
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

      // Canvas
      canvasArea:      $('canvasArea'),
      canvasWrapper:   $('canvasWrapper'),
      mainCanvas:      $('mainCanvas'),
      annotSvg:        $('annotSvg'),

      // Flyouts
      flyoutOverlay:   $('flyoutOverlay'),
      flyoutZoom:      $('flyoutZoom'),
      flyoutProgress:  $('flyoutProgress'),
      flyoutObjects:   $('flyoutObjects'),
      flyoutOther:     $('flyoutOther'),

      // Zoom panel
      btnZoomOut:      $('btnZoomOut'),
      btnZoomIn:       $('btnZoomIn'),
      zoomInput:       $('zoomInput'),
      btnZoomReset2:   $('btnZoomReset2'),
      btnZoomCenter2:  $('btnZoomCenter2'),

      // Progress panel
      statTotal:       $('statTotal'),
      statDone:        $('statDone'),
      statLeft:        $('statLeft'),

      // Objects panel
      objCount:        $('objCount'),
      objectList:      $('objectList'),

      // Other menu
      btnDownloadZip:  $('btnDownloadZip'),
      btnReload:       $('btnReload'),
      btnVersionInfo:  $('btnVersionInfo'),

      // Modal
      modalVersion:    $('modalVersion'),
      modalVersionTitle: $('modalVersionTitle'),
      mdContent:       $('mdContent'),
      mdOlderLink:     $('mdOlderLink'),
      mdOlderLinkAnchor: $('mdOlderLinkAnchor'),
      btnCloseModal:   $('btnCloseModal'),
    };

    // Init canvas
    CanvasManager.init(els.mainCanvas, els.annotSvg, els.canvasWrapper, els.canvasArea);
    CanvasManager.onShapesChanged(handleShapesChanged);

    // Display version on load screen
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
  const FLYOUTS = {
    zoom:     { panel: null, btn: null },
    progress: { panel: null, btn: null },
    objects:  { panel: null, btn: null },
    other:    { panel: null, btn: null },
  };

  let _activeFlyout = null;

  function initFlyouts() {
    FLYOUTS.zoom     = { panel: els.flyoutZoom,     btn: els.btnZoomPanel };
    FLYOUTS.progress = { panel: els.flyoutProgress, btn: els.btnProgress };
    FLYOUTS.objects  = { panel: els.flyoutObjects,  btn: els.btnObjPanel };
    FLYOUTS.other    = { panel: els.flyoutOther,    btn: els.btnOtherMenu };
  }

  function openFlyout(name) {
    if (_activeFlyout === name) {
      closeFlyout();
      return;
    }
    closeFlyout(false);
    _activeFlyout = name;
    const f = FLYOUTS[name];
    f.panel.classList.add('open');
    f.btn.classList.add('open');
    els.flyoutOverlay.classList.add('open');
  }

  function closeFlyout(resetOverlay = true) {
    if (_activeFlyout) {
      const f = FLYOUTS[_activeFlyout];
      f.panel.classList.remove('open');
      f.btn.classList.remove('open');
      _activeFlyout = null;
    }
    if (resetOverlay) els.flyoutOverlay.classList.remove('open');
  }

  // ─── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    initFlyouts();

    // Load
    els.btnLoadFolder.addEventListener('click', () => els.fileInputFolder.click());
    els.btnLoadZip.addEventListener('click', () => els.fileInputZip.click());
    els.fileInputFolder.addEventListener('change', onFolderSelected);
    els.fileInputZip.addEventListener('change', onZipSelected);

    // Load screen version button — モーダルを開く前にelsが初期化済みであることを確認
    els.btnLoadVersionInfo.addEventListener('click', () => showVersionModal());
    els.loadVersionText.addEventListener('click', () => showVersionModal());

    // Navigation
    els.btnPrev.addEventListener('click', () => { if (DataManager.prev()) showCurrentImage(); });
    els.btnNext.addEventListener('click', () => { if (DataManager.next()) showCurrentImage(); });

    // Confirm
    els.btnConfirm.addEventListener('click', toggleConfirm);

    // Mode
    els.btnModeSelect.addEventListener('click', () => setMode('select'));
    els.btnModeAdd.addEventListener('click', () => setMode('add'));

    // View controls (sidebar)
    els.btnZoomReset.addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
    els.btnZoomCenter.addEventListener('click', () => CanvasManager.centerImage());

    // Flyout buttons
    els.btnZoomPanel.addEventListener('click', () => openFlyout('zoom'));
    els.btnProgress.addEventListener('click', () => {
      updateProgressStats();
      openFlyout('progress');
    });
    els.btnObjPanel.addEventListener('click', () => {
      openFlyout('objects');
    });
    els.btnOtherMenu.addEventListener('click', () => {
      openFlyout('other');
    });

    // Overlay close
    els.flyoutOverlay.addEventListener('click', () => closeFlyout());

    // Flyout close buttons
    document.querySelectorAll('[data-close-flyout]').forEach(btn => {
      btn.addEventListener('click', () => closeFlyout());
    });

    // Zoom panel controls
    els.btnZoomIn.addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomIn()));
    els.btnZoomOut.addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomOut()));
    els.zoomInput.addEventListener('change', onZoomInputChange);
    els.zoomInput.addEventListener('blur', onZoomInputChange);
    els.btnZoomReset2.addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
    els.btnZoomCenter2.addEventListener('click', () => CanvasManager.centerImage());

    // Labels
    els.btnAddLabel.addEventListener('click', () => {
      els.addLabelForm.classList.toggle('hidden');
      if (!els.addLabelForm.classList.contains('hidden')) {
        els.newLabelInput.focus();
      }
    });
    els.btnConfirmAddLabel.addEventListener('click', onAddLabel);
    els.btnCancelAddLabel.addEventListener('click', () => {
      els.addLabelForm.classList.add('hidden');
      els.newLabelInput.value = '';
    });
    els.newLabelInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') onAddLabel();
      if (e.key === 'Escape') {
        els.addLabelForm.classList.add('hidden');
        els.newLabelInput.value = '';
      }
    });

    // Other menu
    els.btnDownloadZip.addEventListener('click', () => { closeFlyout(); onDownloadZip(); });
    els.btnReload.addEventListener('click', () => { closeFlyout(); showLoadScreen(); });
    els.btnVersionInfo.addEventListener('click', () => { closeFlyout(); showVersionModal(); });

    // Version modal
    els.btnCloseModal.addEventListener('click', closeVersionModal);
    els.modalVersion.addEventListener('click', e => {
      if (e.target === els.modalVersion) closeVersionModal();
    });
    initSettings();
  }

  // ─── File Loading ──────────────────────────────────────────
  async function onFolderSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // モーダルが開いている場合は閉じる（リリースノートを見た後にフォルダを開く場合）
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
    // モーダルが開いている場合は閉じる（リリースノートを見た後にZIPを開く場合）
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
    const fromData = DataManager.collectAllLabels();
    const storedColors = Storage.getLabelColors();
    const fromStorage = Object.keys(storedColors);
    const labelSet = new Set([...fromData, ...fromStorage]);
    _labels = [...labelSet].sort();
    _labelColors = {};
    for (const label of _labels) {
      _labelColors[label] = Storage.getOrAssignColor(label);
    }
    // Auto-select first label
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

      // Color swatch
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
        Storage.setLabelColor(label, newColor);
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

      // Tap label item: activate or change selected object's label
      item.addEventListener('click', () => onLabelItemClick(label));

      els.labelList.appendChild(item);
    }
  }

  function onLabelItemClick(label) {
    const prevActive = _activeLabel;
    _activeLabel = label;

    // If in select mode and an object is selected → change its label
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
    Storage.setLabelColor(name, color);
    _activeLabel = name;  // auto-activate new label
    els.newLabelInput.value = '';
    els.addLabelForm.classList.add('hidden');
    renderLabelList();
    CanvasManager.setLabelColors(_labelColors);
  }

  function deleteLabel(label) {
    if (!confirm(`ラベル「${label}」を削除しますか？\nこのラベルを持つ全てのオブジェクトも削除されます。`)) return;
    for (const file of DataManager.files) {
      if (!file.json || !file.json.shapes) continue;
      const oldLen = file.json.shapes.length;
      file.json.shapes = file.json.shapes.filter(s => s.label !== label);
      if (file.json.shapes.length !== oldLen) {
        file.modified = true;
        Storage.saveJson(file.name, file.json);
      }
    }
    _labels = _labels.filter(l => l !== label);
    delete _labelColors[label];
    Storage.removeLabelColor(label);
    if (_activeLabel === label) {
      _activeLabel = _labels.length > 0 ? _labels[0] : null;
    }
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

      item.addEventListener('click', () => {
        CanvasManager.setSelectedIdx(i);
        renderObjectList(shapes);
      });

      item.appendChild(swatch);
      item.appendChild(labelSpan);
      item.appendChild(idxSpan);
      item.appendChild(del);
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
    updateConfirmButton(file.name);
    try {
      await CanvasManager.loadImage(file.imageURL);
    } catch (err) { console.error(err); }
    const shapes = DataManager.getShapes(file);
    CanvasManager.setShapes(shapes, _labelColors);
    renderObjectList(shapes);
    renderLabelList();
    updateZoomDisplay(CanvasManager.getZoom());
  }

  // ─── Progress ──────────────────────────────────────────────
  function updateProgressStats() {
    const total = DataManager.count();
    const confirmed = Storage.getConfirmed();
    let doneCount = 0;
    for (const file of DataManager.files) {
      if (confirmed.has(file.name)) doneCount++;
    }
    els.statTotal.textContent = total;
    els.statDone.textContent = doneCount;
    els.statLeft.textContent = total - doneCount;
  }

  // ─── Confirm ───────────────────────────────────────────────
  function toggleConfirm() {
    const file = DataManager.current();
    if (!file) return;
    Storage.setConfirmed(file.name, !Storage.isConfirmed(file.name));
    updateConfirmButton(file.name);
    updateProgressStats();
  }

  function updateConfirmButton(filename) {
    const confirmed = Storage.isConfirmed(filename);
    if (confirmed) {
      els.btnConfirm.classList.add('confirmed');
      els.confirmLabel.textContent = '確認済';
    } else {
      els.btnConfirm.classList.remove('confirmed');
      els.confirmLabel.textContent = '確認';
    }
  }

  // ─── Zoom ──────────────────────────────────────────────────
  function updateZoomDisplay(zoom) {
    els.zoomInput.value = Math.round(zoom * 100);
  }
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
        // Also update object panel if open
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
        if (!_labels.includes(label)) {
          _labels.push(label);
          _labels.sort();
          _labelColors[label] = Storage.getOrAssignColor(label);
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
        if (data >= 0 && data < shapes.length) {
          DataManager.updateShape(file, data, shapes[data]);
        }
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
    if (!ver) {
      els.mdContent.innerHTML = '<p>バージョン情報が見つかりません。</p>';
      return;
    }

    els.modalVersionTitle.textContent = `PenAno v${ver.version}`;
    els.mdContent.innerHTML = '<p style="color:var(--text2);">読み込み中...</p>';
    els.mdOlderLink.style.display = 'none';

    // ページのベースURLを基準にした絶対パスでfetchする
    // （ロード画面・アプリ画面どちらから呼ばれても正しく解決される）
    const docUrl = new URL(ver.docFile, document.baseURI).href + '?t=' + Date.now();

    try {
      const res = await fetch(docUrl);
      if (!res.ok) throw new Error('fetch failed: ' + res.status);
      const md = await res.text();
      // Use marked.js for rendering
      const html = marked.parse(md);
      els.mdContent.innerHTML = html;
      // Open links in new tab
      els.mdContent.querySelectorAll('a').forEach(a => {
        a.target = '_blank';
        a.rel = 'noopener';
      });
    } catch (e) {
      const isOffline = !navigator.onLine;
      els.mdContent.innerHTML = `
        <h1>PenAno v${ver.version}</h1>
        <p style="color:var(--text2);">
          ${isOffline
            ? 'オフラインのため、リリースノートを取得できませんでした。'
            : 'リリースノートを読み込めませんでした。'}
        </p>
      `;
    }

    // Show older changelog link
    if (ver.githubRepo) {
      els.mdOlderLink.style.display = 'block';
      els.mdOlderLinkAnchor.href = ver.githubRepo + '/blob/main/doc/CHANGELOG.md';
    }
  }

  function closeVersionModal() {
    els.modalVersion.classList.remove('open');
  }

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
    } catch (err) {
      console.error(err); alert('ZIPの作成に失敗しました。');
    }
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