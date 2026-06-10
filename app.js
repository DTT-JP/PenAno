/**
 * app.js – メインアプリケーションロジック
 * DataManager, CanvasManager, Storage を統合し、UIを制御する
 */
(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────
  let _labels = [];         // 全ラベル名の配列
  let _labelColors = {};    // { label: '#rrggbb' }

  // ─── DOM Refs ──────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  let els; // populated on DOMContentLoaded

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

      app:             $('app'),
      sidebar:         $('sidebar'),

      btnFullscreen:   $('btnFullscreen'),
      btnPrev:         $('btnPrev'),
      btnNext:         $('btnNext'),
      fileName:        $('fileName'),
      fileCounter:     $('fileCounter'),
      statTotal:       $('statTotal'),
      statDone:        $('statDone'),
      statLeft:        $('statLeft'),
      btnConfirm:      $('btnConfirm'),
      confirmLabel:    $('confirmLabel'),

      btnZoomOut:      $('btnZoomOut'),
      btnZoomIn:       $('btnZoomIn'),
      zoomInput:       $('zoomInput'),
      btnZoomReset:    $('btnZoomReset'),

      btnModeSelect:   $('btnModeSelect'),
      btnModeAdd:      $('btnModeAdd'),
      addLabelPicker:  $('addLabelPicker'),
      selectAddLabel:  $('selectAddLabel'),

      btnAddLabel:     $('btnAddLabel'),
      labelList:       $('labelList'),
      addLabelForm:    $('addLabelForm'),
      newLabelInput:   $('newLabelInput'),
      newLabelColor:   $('newLabelColor'),
      btnConfirmAddLabel: $('btnConfirmAddLabel'),
      btnCancelAddLabel:  $('btnCancelAddLabel'),

      objCount:        $('objCount'),
      objectList:      $('objectList'),

      btnDownloadZip:  $('btnDownloadZip'),
      btnReload:       $('btnReload'),

      canvasArea:      $('canvasArea'),
      canvasWrapper:   $('canvasWrapper'),
      mainCanvas:      $('mainCanvas'),
      annotSvg:        $('annotSvg'),
    };

    // Init canvas manager
    CanvasManager.init(els.mainCanvas, els.annotSvg, els.canvasWrapper, els.canvasArea);
    CanvasManager.onShapesChanged(handleShapesChanged);

    bindEvents();
  });

  // ─── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    // Load buttons
    els.btnLoadFolder.addEventListener('click', () => els.fileInputFolder.click());
    els.btnLoadZip.addEventListener('click', () => els.fileInputZip.click());
    els.fileInputFolder.addEventListener('change', onFolderSelected);
    els.fileInputZip.addEventListener('change', onZipSelected);

    // Navigation
    els.btnPrev.addEventListener('click', () => { if (DataManager.prev()) showCurrentImage(); });
    els.btnNext.addEventListener('click', () => { if (DataManager.next()) showCurrentImage(); });

    // Confirm
    els.btnConfirm.addEventListener('click', toggleConfirm);

    // Zoom
    els.btnZoomIn.addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomIn()));
    els.btnZoomOut.addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomOut()));
    els.btnZoomReset.addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
    els.zoomInput.addEventListener('change', onZoomInputChange);
    els.zoomInput.addEventListener('blur', onZoomInputChange);

    // Mode
    els.btnModeSelect.addEventListener('click', () => setMode('select'));
    els.btnModeAdd.addEventListener('click', () => setMode('add'));

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
    els.newLabelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onAddLabel();
    });

    // Fullscreen
    els.btnFullscreen.addEventListener('click', toggleFullscreen);

    // Reload & Download
    els.btnDownloadZip.addEventListener('click', onDownloadZip);
    els.btnReload.addEventListener('click', showLoadScreen);
  }

  // ─── File Loading ──────────────────────────────────────────
  async function onFolderSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    showProgress();
    try {
      await DataManager.loadFromFileList(files, (done, total) => {
        updateProgress(done, total);
      });
      onDataLoaded();
    } catch (err) {
      console.error('フォルダ読み込みエラー:', err);
      alert('ファイルの読み込みに失敗しました。');
      hideProgress();
    }
    // reset input so same folder can be re-selected
    e.target.value = '';
  }

  async function onZipSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    showProgress();
    try {
      await DataManager.loadFromZip(file, (done, total) => {
        updateProgress(done, total);
      });
      onDataLoaded();
    } catch (err) {
      console.error('ZIP読み込みエラー:', err);
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

  function hideProgress() {
    els.loadProgress.classList.add('hidden');
  }

  function onDataLoaded() {
    if (DataManager.count() === 0) {
      alert('画像ファイルが見つかりませんでした。');
      hideProgress();
      return;
    }

    // Collect labels and assign colors
    initLabels();

    // Switch to app view
    els.loadScreen.classList.add('hidden');
    els.app.classList.remove('hidden');

    // Set initial mode
    setMode('select');

    // Show first image
    showCurrentImage();
  }

  // ─── Labels ────────────────────────────────────────────────
  function initLabels() {
    // Collect from all JSON files
    const fromData = DataManager.collectAllLabels();
    // Merge with any existing in Storage
    const storedColors = Storage.getLabelColors();
    const fromStorage = Object.keys(storedColors);

    const labelSet = new Set([...fromData, ...fromStorage]);
    _labels = [...labelSet].sort();

    // Assign colors
    _labelColors = {};
    for (const label of _labels) {
      _labelColors[label] = Storage.getOrAssignColor(label);
    }
  }

  function renderLabelList() {
    els.labelList.innerHTML = '';

    for (const label of _labels) {
      const color = _labelColors[label] || '#e94560';

      const item = document.createElement('div');
      item.className = 'label-item';

      // Color swatch with hidden color input
      const swatch = document.createElement('label');
      swatch.className = 'label-swatch';
      swatch.style.background = color;

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'label-swatch-input';
      colorInput.value = color;
      colorInput.addEventListener('input', (e) => {
        const newColor = e.target.value;
        swatch.style.background = newColor;
        _labelColors[label] = newColor;
        Storage.setLabelColor(label, newColor);
        CanvasManager.setLabelColors(_labelColors);
      });
      swatch.appendChild(colorInput);

      const name = document.createElement('span');
      name.className = 'label-name';
      name.textContent = label;

      const del = document.createElement('button');
      del.className = 'label-del';
      del.textContent = '×';
      del.addEventListener('click', () => deleteLabel(label));

      item.appendChild(swatch);
      item.appendChild(name);
      item.appendChild(del);
      els.labelList.appendChild(item);
    }
  }

  function populateAddLabelSelect() {
    els.selectAddLabel.innerHTML = '';
    if (_labels.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(ラベルなし)';
      els.selectAddLabel.appendChild(opt);
      return;
    }
    for (const label of _labels) {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      els.selectAddLabel.appendChild(opt);
    }
  }

  function onAddLabel() {
    const name = els.newLabelInput.value.trim();
    if (!name) return;

    if (_labels.includes(name)) {
      alert('このラベルは既に存在します。');
      return;
    }

    const color = els.newLabelColor.value || '#e94560';
    _labels.push(name);
    _labels.sort();
    _labelColors[name] = color;
    Storage.setLabelColor(name, color);

    els.newLabelInput.value = '';
    els.addLabelForm.classList.add('hidden');

    renderLabelList();
    populateAddLabelSelect();
    CanvasManager.setLabelColors(_labelColors);
  }

  function deleteLabel(label) {
    if (!confirm(`ラベル「${label}」を削除しますか？\nこのラベルを持つ全てのオブジェクトも削除されます。`)) return;

    // Remove from all shapes in all files
    for (const file of DataManager.files) {
      if (!file.json || !file.json.shapes) continue;
      const oldLen = file.json.shapes.length;
      file.json.shapes = file.json.shapes.filter(s => s.label !== label);
      if (file.json.shapes.length !== oldLen) {
        file.modified = true;
        Storage.saveJson(file.name, file.json);
      }
    }

    // Remove from labels list
    _labels = _labels.filter(l => l !== label);
    delete _labelColors[label];
    Storage.removeLabelColor(label);

    renderLabelList();
    populateAddLabelSelect();

    // Refresh current view
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
      const color = _labelColors[shape.label] || '#e94560';

      const item = document.createElement('div');
      item.className = 'obj-item' + (i === selectedIdx ? ' selected' : '');
      item.dataset.idx = i;

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
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteObject(i);
      });

      // Click to select
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

    // Update nav info
    els.fileName.textContent = file.name;
    els.fileCounter.textContent = `${DataManager.index() + 1} / ${DataManager.count()}`;

    // Update progress stats
    updateProgressStats();

    // Update confirm button
    updateConfirmButton(file.name);

    // Load image
    try {
      await CanvasManager.loadImage(file.imageURL);
    } catch (err) {
      console.error('画像読み込みエラー:', err);
    }

    // Set shapes
    const shapes = DataManager.getShapes(file);
    CanvasManager.setShapes(shapes, _labelColors);

    // Update object list
    renderObjectList(shapes);

    // Update label list
    renderLabelList();
    populateAddLabelSelect();

    // Update zoom display
    updateZoomDisplay(CanvasManager.getZoom());
  }

  // ─── Progress Stats ────────────────────────────────────────
  function updateProgressStats() {
    const total = DataManager.count();
    const confirmed = Storage.getConfirmed();
    let doneCount = 0;
    for (const file of DataManager.files) {
      if (confirmed.has(file.name)) doneCount++;
    }
    const left = total - doneCount;

    els.statTotal.textContent = total;
    els.statDone.textContent = doneCount;
    els.statLeft.textContent = left;
  }

  // ─── Confirm ───────────────────────────────────────────────
  function toggleConfirm() {
    const file = DataManager.current();
    if (!file) return;

    const isNowConfirmed = Storage.isConfirmed(file.name);
    Storage.setConfirmed(file.name, !isNowConfirmed);
    updateConfirmButton(file.name);
    updateProgressStats();
  }

  function updateConfirmButton(filename) {
    const confirmed = Storage.isConfirmed(filename);
    if (confirmed) {
      els.btnConfirm.classList.add('confirmed');
      els.confirmLabel.textContent = '確認済み';
    } else {
      els.btnConfirm.classList.remove('confirmed');
      els.confirmLabel.textContent = '確認済みにする';
    }
  }

  // ─── Zoom ──────────────────────────────────────────────────
  function updateZoomDisplay(zoom) {
    els.zoomInput.value = Math.round(zoom * 100);
  }

  function onZoomInputChange() {
    const val = parseInt(els.zoomInput.value, 10);
    if (isNaN(val) || val < 10) {
      els.zoomInput.value = 10;
      CanvasManager.setZoom(0.1);
    } else if (val > 500) {
      els.zoomInput.value = 500;
      CanvasManager.setZoom(5.0);
    } else {
      CanvasManager.setZoom(val / 100);
    }
  }

  // ─── Mode ──────────────────────────────────────────────────
  function setMode(mode) {
    CanvasManager.setMode(mode);

    els.btnModeSelect.classList.toggle('active', mode === 'select');
    els.btnModeAdd.classList.toggle('active', mode === 'add');

    if (mode === 'add') {
      els.addLabelPicker.classList.remove('hidden');
      populateAddLabelSelect();
    } else {
      els.addLabelPicker.classList.add('hidden');
    }
  }

  // ─── Canvas Callback ──────────────────────────────────────
  function handleShapesChanged(eventType, data) {
    const file = DataManager.current();
    if (!file) return;

    switch (eventType) {
      case 'select': {
        // Update object list selection highlight
        const shapes = DataManager.getShapes(file);
        renderObjectList(shapes);
        break;
      }

      case 'addShape': {
        // data = { x1, y1, x2, y2 }
        const label = els.selectAddLabel.value;
        if (!label) {
          alert('ラベルを選択してください。\n先にラベルを追加するか、ラベル一覧から選択してください。');
          return;
        }
        const { w, h } = CanvasManager.getImageSize();
        const shape = DataManager.makeRectShape(label, data.x1, data.y1, data.x2, data.y2, w, h);

        // Ensure this label is in our labels list
        if (!_labels.includes(label)) {
          _labels.push(label);
          _labels.sort();
          _labelColors[label] = Storage.getOrAssignColor(label);
          renderLabelList();
          populateAddLabelSelect();
        }

        DataManager.addShape(file, shape);
        const shapes = DataManager.getShapes(file);
        CanvasManager.setShapes(shapes, _labelColors);
        // Select the newly added shape
        CanvasManager.setSelectedIdx(shapes.length - 1);
        renderObjectList(shapes);
        break;
      }

      case 'shapeUpdated': {
        // data = idx. Shape points were already updated by CanvasManager
        // Just mark as modified in DataManager
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

  // ─── Fullscreen ────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  // ─── Download ZIP ──────────────────────────────────────────
  async function onDownloadZip() {
    const zip = new JSZip();
    let hasData = false;

    for (const file of DataManager.files) {
      if (file.json) {
        const base = file.name.replace(/\.[^.]+$/, '');
        const jsonStr = JSON.stringify(file.json, null, 2);
        zip.file(base + '.json', jsonStr);
        hasData = true;
      }
    }

    if (!hasData) {
      alert('保存するデータがありません。');
      return;
    }

    try {
      const content = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'annotations.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP作成エラー:', err);
      alert('ZIPの作成に失敗しました。');
    }
  }

  // ─── Reload (back to load screen) ─────────────────────────
  function showLoadScreen() {
    els.app.classList.add('hidden');
    els.loadScreen.classList.remove('hidden');
    els.loadProgress.classList.add('hidden');

    // Reset file inputs
    els.fileInputFolder.value = '';
    els.fileInputZip.value = '';
  }

})();
