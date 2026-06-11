/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * data.js – ファイル読み込み・LabelMe JSON管理
 * セッションIDを保持し、Storage への全アクセスにそれを渡す。
 */
const DataManager = (() => {
  let _files = [];
  let _current = 0;
  let _sessionId = null;   // 現在のセッションID

  function imgExts() { return ['jpg','jpeg','png','bmp','webp','gif']; }
  function isImage(name) { return imgExts().includes(name.split('.').pop().toLowerCase()); }
  function baseName(path) { return path.split('/').pop().split('\\').pop(); }
  function stripExt(name) { return name.replace(/\.[^.]+$/, ''); }

  /** フォルダ名を推測（File.webkitRelativePath から最初のセグメント） */
  function detectFolderName(fileList) {
    for (const f of fileList) {
      if (f.webkitRelativePath) {
        return f.webkitRelativePath.split('/')[0];
      }
    }
    return 'folder_' + Date.now();
  }

  async function loadFromFileList(fileList, onProgress) {
    const files = Array.from(fileList);
    const folderName = detectFolderName(files);

    const images = files.filter(f => isImage(f.name));
    const jsons  = files.filter(f => f.name.toLowerCase().endsWith('.json'));

    const jsonMap = {};
    for (const jf of jsons) {
      const text = await jf.text();
      try { jsonMap[stripExt(baseName(jf.name))] = JSON.parse(text); } catch(e) {}
    }

    // セッション登録（ファイル数・総サイズでフィンガープリント）
    const imgCount = images.length;
    const totalSize = images.reduce((sum, f) => sum + f.size, 0);
    _sessionId = Storage.registerSession('folder', folderName, imgCount, totalSize);

    // レガシーデータマイグレーション
    const imgNames = images.map(f => baseName(f.name));
    Storage.migrateLegacy(_sessionId, imgNames);

    _files = [];
    for (let i = 0; i < images.length; i++) {
      const imgFile = images[i];
      const name = baseName(imgFile.name);
      const base = stripExt(name);
      const url  = URL.createObjectURL(imgFile);
      let json = jsonMap[base] || null;
      const saved = Storage.getJson(_sessionId, name);
      if (saved) json = saved;
      _files.push({ name, imageURL: url, json, modified: !!saved });
      if (onProgress) onProgress(i + 1, images.length);
    }
    _files.sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    _current = 0;
    return _files;
  }

  async function loadFromZip(zipFile, onProgress) {
    const zipName = zipFile.name;
    const ab = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(ab);
    const entries = Object.values(zip.files).filter(f => !f.dir);
    const imageEntries = entries.filter(f => isImage(baseName(f.name)));
    const jsonEntries  = entries.filter(f => baseName(f.name).toLowerCase().endsWith('.json'));

    const jsonMap = {};
    for (const je of jsonEntries) {
      const text = await je.async('text');
      try { jsonMap[stripExt(baseName(je.name))] = JSON.parse(text); } catch(e) {}
    }

    // セッション登録（ファイル数・圧縮前総サイズでフィンガープリント）
    const imgCount = imageEntries.length;
    const totalSize = imageEntries.reduce((sum, ie) => sum + (ie._data?.uncompressedSize ?? ie.uncompressedSize ?? 0), 0);
    _sessionId = Storage.registerSession('zip', zipName, imgCount, totalSize);

    // レガシーマイグレーション
    const imgNames = imageEntries.map(ie => baseName(ie.name));
    Storage.migrateLegacy(_sessionId, imgNames);

    _files = [];
    for (let i = 0; i < imageEntries.length; i++) {
      const ie = imageEntries[i];
      const name = baseName(ie.name);
      const base = stripExt(name);
      const blob = await ie.async('blob');
      const url  = URL.createObjectURL(blob);
      let json = jsonMap[base] || null;
      const saved = Storage.getJson(_sessionId, name);
      if (saved) json = saved;
      _files.push({ name, imageURL: url, json, modified: !!saved });
      if (onProgress) onProgress(i + 1, imageEntries.length);
    }
    _files.sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    _current = 0;
    return _files;
  }

  function getSessionId() { return _sessionId; }
  function count()   { return _files.length; }
  function index()   { return _current; }
  function current() { return _files[_current] || null; }
  function goTo(idx) { if (idx < 0 || idx >= _files.length) return false; _current = idx; return true; }
  function next() { return goTo(_current + 1); }
  function prev() { return goTo(_current - 1); }

  function ensureJson(file) {
    if (!file.json) file.json = { version: '5.0.1', flags: {}, shapes: [], imagePath: file.name, imageData: null, imageHeight: 0, imageWidth: 0 };
    if (!file.json.shapes) file.json.shapes = [];
  }
  function getShapes(file) { ensureJson(file); return file.json.shapes; }
  function saveToStorage(file) {
    if (file.json && _sessionId) Storage.saveJson(_sessionId, file.name, file.json);
  }
  function addShape(file, shape) { ensureJson(file); file.json.shapes.push(shape); file.modified = true; saveToStorage(file); }
  function removeShape(file, idx) { ensureJson(file); file.json.shapes.splice(idx, 1); file.modified = true; saveToStorage(file); }
  function updateShape(file, idx, shape) { ensureJson(file); file.json.shapes[idx] = shape; file.modified = true; saveToStorage(file); }

  function collectAllLabels() {
    const set = new Set();
    for (const f of _files) { if (!f.json || !f.json.shapes) continue; for (const s of f.json.shapes) { if (s.label) set.add(s.label); } }
    return [...set].sort();
  }

  function makeRectShape(label, x1, y1, x2, y2, imgW, imgH) {
    const cx1 = Math.max(0, Math.min(imgW, Math.min(x1, x2)));
    const cy1 = Math.max(0, Math.min(imgH, Math.min(y1, y2)));
    const cx2 = Math.max(0, Math.min(imgW, Math.max(x1, x2)));
    const cy2 = Math.max(0, Math.min(imgH, Math.max(y1, y2)));
    return { label, points: [[cx1, cy1],[cx2, cy2]], group_id: null, shape_type: 'rectangle', flags: {} };
  }

  return {
    loadFromFileList, loadFromZip,
    getSessionId,
    count, index, current, goTo, next, prev,
    getShapes, addShape, removeShape, updateShape,
    collectAllLabels, makeRectShape,
    get files() { return _files; },
  };
})();