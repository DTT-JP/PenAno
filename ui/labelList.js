/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/labelList.js - ラベルリスト UI */

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
