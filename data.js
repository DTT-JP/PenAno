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
  function readImageSize(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
  }

  function applyImageMeta(file) {
    if (!file) return;
    ensureJson(file);
    file.json.imagePath = file.name;
    if (!file.json.imageWidth && file.width) file.json.imageWidth = file.width;
    if (!file.json.imageHeight && file.height) file.json.imageHeight = file.height;
  }

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
      const size = await readImageSize(url);
      let json = jsonMap[base] || null;
      const saved = Storage.getJson(_sessionId, name);
      if (saved) json = saved;
      const file = { name, imageURL: url, imageBlob: imgFile, width: size.width, height: size.height, json, modified: !!saved };
      if (json) applyImageMeta(file);
      _files.push(file);
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
      const size = await readImageSize(url);
      let json = jsonMap[base] || null;
      const saved = Storage.getJson(_sessionId, name);
      if (saved) json = saved;
      const file = { name, imageURL: url, imageBlob: blob, width: size.width, height: size.height, json, modified: !!saved };
      if (json) applyImageMeta(file);
      _files.push(file);
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
  function getShapes(file) { ensureJson(file); applyImageMeta(file); return file.json.shapes; }
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

  function buildClassMap(labels) {
    const map = {};
    labels.forEach((label, idx) => { map[label] = idx; });
    return map;
  }

  function getSplitName(idx, total, ratios) {
    const train = Math.max(0, ratios?.train ?? 70);
    const val = Math.max(0, ratios?.val ?? 20);
    const trainCount = Math.round(total * train / 100);
    const valCount = Math.round(total * val / 100);
    if (idx < trainCount) return 'train';
    if (idx < trainCount + valCount) return 'val';
    return 'test';
  }

  function rectBox(shape, imgW, imgH) {
    if (!shape || shape.shape_type !== 'rectangle' || !Array.isArray(shape.points) || shape.points.length < 2) return null;
    const p1 = shape.points[0], p2 = shape.points[1];
    const x1 = Math.max(0, Math.min(imgW, Math.min(Number(p1[0]), Number(p2[0]))));
    const y1 = Math.max(0, Math.min(imgH, Math.min(Number(p1[1]), Number(p2[1]))));
    const x2 = Math.max(0, Math.min(imgW, Math.max(Number(p1[0]), Number(p2[0]))));
    const y2 = Math.max(0, Math.min(imgH, Math.max(Number(p1[1]), Number(p2[1]))));
    if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) return null;
    return { x1, y1, x2, y2, width: x2 - x1, height: y2 - y1 };
  }

  function exportStatsCsv() {
    const confirmed = _sessionId ? Storage.getConfirmed(_sessionId) : new Set();
    const rows = [['filename', 'label', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'confirmed']];
    for (const file of _files) {
      applyImageMeta(file);
      const imgW = file.json.imageWidth || file.width || 0;
      const imgH = file.json.imageHeight || file.height || 0;
      const isDone = confirmed.has(file.name) ? 'true' : 'false';
      const shapes = file.json.shapes || [];
      if (!shapes.length) rows.push([file.name, '', '', '', '', '', '', '', isDone]);
      for (const shape of shapes) {
        const box = rectBox(shape, imgW, imgH) || { x1: '', y1: '', x2: '', y2: '', width: '', height: '' };
        rows.push([file.name, shape.label || '', box.x1, box.y1, box.x2, box.y2, box.width, box.height, isDone]);
      }
    }
    return rows.map(row => row.map(csvCell).join(',')).join('\n') + '\n';
  }

  function csvCell(value) {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function exportYolo(options = {}) {
    const labels = collectAllLabels();
    const classMap = buildClassMap(labels);
    const ratios = options.ratios || { train: 70, val: 20, test: 10 };
    const rootPath = options.rootPath || '.';
    const includeDatasetYaml = options.includeDatasetYaml !== false;
    const files = _files.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    const zip = new JSZip();

    files.forEach((file, idx) => {
      applyImageMeta(file);
      const split = getSplitName(idx, files.length, ratios);
      const base = stripExt(file.name);
      const imgW = file.json.imageWidth || file.width || 0;
      const imgH = file.json.imageHeight || file.height || 0;
      const lines = [];
      for (const shape of file.json.shapes || []) {
        const box = rectBox(shape, imgW, imgH);
        if (!box || classMap[shape.label] === undefined || !imgW || !imgH) continue;
        const cx = (box.x1 + box.width / 2) / imgW;
        const cy = (box.y1 + box.height / 2) / imgH;
        const w = box.width / imgW;
        const h = box.height / imgH;
        lines.push([classMap[shape.label], cx, cy, w, h].map(formatYoloNumber).join(' '));
      }
      zip.file(`${split}/labels/${base}.txt`, lines.join('\n') + (lines.length ? '\n' : ''));
      if (file.imageBlob) zip.file(`${split}/images/${file.name}`, file.imageBlob);
    });

    if (includeDatasetYaml) {
      const yaml = [
        `path: ${JSON.stringify(rootPath)}`,
        'train: train/images',
        'val: val/images',
        'test: test/images',
        `nc: ${labels.length}`,
        'names:',
        ...labels.map((label, idx) => `  ${idx}: ${JSON.stringify(label)}`),
        '',
      ].join('\n');
      zip.file('dataset.yaml', yaml);
    }
    return { zip, labels, classMap };
  }

  function formatYoloNumber(value) {
    if (Number.isInteger(value)) return String(value);
    return Number(value).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  }

  function exportCoco(options = {}) {
    const labels = collectAllLabels();
    const classMap = buildClassMap(labels);
    const categories = labels.map(label => ({ id: classMap[label] + 1, name: label, supercategory: 'object' }));
    const ratios = options.ratios || { train: 70, val: 20, test: 10 };
    const files = _files.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    const bySplit = { train: [], val: [], test: [] };
    files.forEach((file, idx) => bySplit[getSplitName(idx, files.length, ratios)].push(file));

    const zip = new JSZip();
    for (const split of ['train', 'val', 'test']) {
      const images = [];
      const annotations = [];
      let annotationId = 1;
      bySplit[split].forEach((file, imageIdx) => {
        applyImageMeta(file);
        const imageId = imageIdx + 1;
        const imgW = file.json.imageWidth || file.width || 0;
        const imgH = file.json.imageHeight || file.height || 0;
        images.push({ id: imageId, file_name: file.name, width: imgW, height: imgH });
        for (const shape of file.json.shapes || []) {
          const box = rectBox(shape, imgW, imgH);
          if (!box || classMap[shape.label] === undefined) continue;
          annotations.push({
            id: annotationId++, image_id: imageId, category_id: classMap[shape.label] + 1,
            bbox: [box.x1, box.y1, box.width, box.height], area: box.width * box.height, iscrowd: 0,
          });
        }
        if (file.imageBlob) zip.file(`${split}/images/${file.name}`, file.imageBlob);
      });
      zip.file(`annotations/instances_${split}.json`, JSON.stringify({ images, annotations, categories }, null, 2));
    }
    return { zip, labels, classMap };
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
    collectAllLabels, makeRectShape, exportStatsCsv, exportYolo, exportCoco,
    get files() { return _files; },
  };
})();