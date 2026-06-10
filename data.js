/**
 * data.js – ファイル読み込み・LabelMe JSON管理
 */
const DataManager = (() => {
  // { filename: { imageBlob, jsonData, imageName } }
  let _files = [];   // array of { name, imageURL, json, modified }
  let _current = 0;

  // ─── Internal helpers ───────────────────────────────────────

  function imgExts() { return ['jpg','jpeg','png','bmp','webp','gif']; }

  function isImage(name) {
    const ext = name.split('.').pop().toLowerCase();
    return imgExts().includes(ext);
  }

  function baseName(path) {
    return path.split('/').pop().split('\\').pop();
  }

  function stripExt(name) {
    return name.replace(/\.[^.]+$/, '');
  }

  // ─── Load from file input (folder) ─────────────────────────
  async function loadFromFileList(fileList, onProgress) {
    const files = Array.from(fileList);
    const images = files.filter(f => isImage(f.name));
    const jsons  = files.filter(f => f.name.toLowerCase().endsWith('.json'));

    // build json map: base → text
    const jsonMap = {};
    for (const jf of jsons) {
      const text = await jf.text();
      try {
        const parsed = JSON.parse(text);
        jsonMap[stripExt(baseName(jf.name))] = parsed;
      } catch(e) { console.warn('JSON parse error:', jf.name); }
    }

    _files = [];
    for (let i = 0; i < images.length; i++) {
      const imgFile = images[i];
      const name = baseName(imgFile.name);
      const base = stripExt(name);
      const url  = URL.createObjectURL(imgFile);
      
      let json = jsonMap[base] || null;
      const saved = Storage.getJson(name);
      if (saved) {
        json = saved;
      }
      
      _files.push({ name, imageURL: url, json: json, modified: !!saved });
      if (onProgress) onProgress(i + 1, images.length);
    }

    _files.sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    _current = 0;
    return _files;
  }

  // ─── Load from ZIP ──────────────────────────────────────────
  async function loadFromZip(zipFile, onProgress) {
    const ab = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(ab);

    const entries = Object.values(zip.files).filter(f => !f.dir);
    const imageEntries = entries.filter(f => isImage(baseName(f.name)));
    const jsonEntries  = entries.filter(f => baseName(f.name).toLowerCase().endsWith('.json'));

    // build json map
    const jsonMap = {};
    for (const je of jsonEntries) {
      const text = await je.async('text');
      try {
        const parsed = JSON.parse(text);
        jsonMap[stripExt(baseName(je.name))] = parsed;
      } catch(e) { console.warn('JSON parse error:', je.name); }
    }

    _files = [];
    for (let i = 0; i < imageEntries.length; i++) {
      const ie = imageEntries[i];
      const name = baseName(ie.name);
      const base = stripExt(name);
      const blob = await ie.async('blob');
      const url  = URL.createObjectURL(blob);
      
      let json = jsonMap[base] || null;
      const saved = Storage.getJson(name);
      if (saved) {
        json = saved;
      }
      
      _files.push({ name, imageURL: url, json: json, modified: !!saved });
      if (onProgress) onProgress(i + 1, imageEntries.length);
    }

    _files.sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    _current = 0;
    return _files;
  }

  // ─── File navigation ────────────────────────────────────────
  function count()   { return _files.length; }
  function index()   { return _current; }
  function current() { return _files[_current] || null; }

  function goTo(idx) {
    if (idx < 0 || idx >= _files.length) return false;
    _current = idx;
    return true;
  }
  function next() { return goTo(_current + 1); }
  function prev() { return goTo(_current - 1); }

  // ─── Shapes ─────────────────────────────────────────────────
  // Ensure json structure
  function ensureJson(file) {
    if (!file.json) {
      file.json = { version: '5.0.1', flags: {}, shapes: [], imagePath: file.name, imageData: null, imageHeight: 0, imageWidth: 0 };
    }
    if (!file.json.shapes) file.json.shapes = [];
  }

  function getShapes(file) {
    ensureJson(file);
    return file.json.shapes;
  }

  function saveToStorage(file) {
    if (file.json) {
      Storage.saveJson(file.name, file.json);
    }
  }

  function addShape(file, shape) {
    ensureJson(file);
    file.json.shapes.push(shape);
    file.modified = true;
    saveToStorage(file);
  }

  function removeShape(file, idx) {
    ensureJson(file);
    file.json.shapes.splice(idx, 1);
    file.modified = true;
    saveToStorage(file);
  }

  function updateShape(file, idx, shape) {
    ensureJson(file);
    file.json.shapes[idx] = shape;
    file.modified = true;
    saveToStorage(file);
  }

  // ─── Collect all labels ──────────────────────────────────────
  function collectAllLabels() {
    const set = new Set();
    for (const f of _files) {
      if (!f.json || !f.json.shapes) continue;
      for (const s of f.json.shapes) {
        if (s.label) set.add(s.label);
      }
    }
    return [...set].sort();
  }

  // ─── Export JSON ─────────────────────────────────────────────
  function exportCurrentJson() {
    const f = current();
    if (!f || !f.json) return null;
    return JSON.stringify(f.json, null, 2);
  }

  // Make a LabelMe rectangle shape
  function makeRectShape(label, x1, y1, x2, y2, imgW, imgH) {
    // Clamp to image bounds
    const cx1 = Math.max(0, Math.min(imgW, Math.min(x1, x2)));
    const cy1 = Math.max(0, Math.min(imgH, Math.min(y1, y2)));
    const cx2 = Math.max(0, Math.min(imgW, Math.max(x1, x2)));
    const cy2 = Math.max(0, Math.min(imgH, Math.max(y1, y2)));
    return {
      label,
      points: [[cx1, cy1],[cx2, cy2]],
      group_id: null,
      shape_type: 'rectangle',
      flags: {}
    };
  }

  return {
    loadFromFileList, loadFromZip,
    count, index, current, goTo, next, prev,
    getShapes, addShape, removeShape, updateShape,
    collectAllLabels, exportCurrentJson, makeRectShape,
    get files() { return _files; }
  };
})();