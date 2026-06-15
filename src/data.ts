/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * data.ts – ファイル読み込み・LabelMe JSON管理
 */
import JSZip from 'jszip';
import Storage from './storage';
import type { FileEntry, LabelMeJson, LabelMeShape } from './types/labelme';

let _files: FileEntry[] = [];
let _current: number = 0;
let _sessionId: string | null = null;

function imgExts(): string[] { return ['jpg','jpeg','png','bmp','webp','gif']; }
function isImage(name: string): boolean { return imgExts().includes(name.split('.').pop()!.toLowerCase()); }
function baseName(path: string): string { return path.split('/').pop()!.split('\\').pop()!; }
function stripExt(name: string): string { return name.replace(/\.[^.]+$/, ''); }

function detectFolderName(fileList: File[]): string {
  for (const f of fileList) {
    if ((f as File & { webkitRelativePath?: string }).webkitRelativePath) {
      return (f as File & { webkitRelativePath: string }).webkitRelativePath.split('/')[0];
    }
  }
  return 'folder_' + Date.now();
}

async function loadFromFileList(
  fileList: FileList | File[],
  onProgress: ((current: number, total: number) => void) | null = null
): Promise<FileEntry[]> {
  const files = Array.from(fileList) as File[];
  const folderName = detectFolderName(files);

  const images = files.filter(f => isImage(f.name));
  const jsons  = files.filter(f => f.name.toLowerCase().endsWith('.json'));

  const jsonMap: Record<string, LabelMeJson> = {};
  for (const jf of jsons) {
    const text = await jf.text();
    try { jsonMap[stripExt(baseName(jf.name))] = JSON.parse(text) as LabelMeJson; } catch(e) {}
  }

  const imgCount = images.length;
  const totalSize = images.reduce((sum, f) => sum + f.size, 0);
  _sessionId = Storage.registerSession('folder', folderName, imgCount, totalSize);

  const imgNames = images.map(f => baseName(f.name));
  Storage.migrateLegacy(_sessionId, imgNames);

  _files = [];
  for (let i = 0; i < images.length; i++) {
    const imgFile = images[i];
    const name = baseName(imgFile.name);
    const base = stripExt(name);
    const url  = URL.createObjectURL(imgFile);
    let json: LabelMeJson | null = jsonMap[base] ?? null;
    const saved = Storage.getJson(_sessionId, name);
    if (saved) json = saved as LabelMeJson;
    _files.push({ name, imageURL: url, json, modified: !!saved });
    if (onProgress) onProgress(i + 1, images.length);
  }
  _files.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  _current = 0;
  return _files;
}

async function loadFromZip(
  zipFile: File,
  onProgress: ((current: number, total: number) => void) | null = null
): Promise<FileEntry[]> {
  const zipName = zipFile.name;
  const ab = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(ab);
  const entries = Object.values(zip.files).filter(f => !f.dir);
  const imageEntries = entries.filter(f => isImage(baseName(f.name)));
  const jsonEntries  = entries.filter(f => baseName(f.name).toLowerCase().endsWith('.json'));

  const jsonMap: Record<string, LabelMeJson> = {};
  for (const je of jsonEntries) {
    const text = await je.async('text');
    try { jsonMap[stripExt(baseName(je.name))] = JSON.parse(text) as LabelMeJson; } catch(e) {}
  }

  const imgCount = imageEntries.length;
  const totalSize = imageEntries.reduce((sum, ie) => {
    const data = (ie as unknown as { _data?: { uncompressedSize?: number }; uncompressedSize?: number });
    return sum + (data._data?.uncompressedSize ?? data.uncompressedSize ?? 0);
  }, 0);
  _sessionId = Storage.registerSession('zip', zipName, imgCount, totalSize);

  const imgNames = imageEntries.map(ie => baseName(ie.name));
  Storage.migrateLegacy(_sessionId, imgNames);

  _files = [];
  for (let i = 0; i < imageEntries.length; i++) {
    const ie = imageEntries[i];
    const name = baseName(ie.name);
    const base = stripExt(name);
    const blob = await ie.async('blob');
    const url  = URL.createObjectURL(blob);
    let json: LabelMeJson | null = jsonMap[base] ?? null;
    const saved = Storage.getJson(_sessionId, name);
    if (saved) json = saved as LabelMeJson;
    _files.push({ name, imageURL: url, json, modified: !!saved });
    if (onProgress) onProgress(i + 1, imageEntries.length);
  }
  _files.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  _current = 0;
  return _files;
}

function getSessionId(): string | null { return _sessionId; }
function count():   number { return _files.length; }
function index():   number { return _current; }
function current(): FileEntry | null { return _files[_current] ?? null; }
function goTo(idx: number): boolean { if (idx < 0 || idx >= _files.length) return false; _current = idx; return true; }
function next(): boolean { return goTo(_current + 1); }
function prev(): boolean { return goTo(_current - 1); }

function ensureJson(file: FileEntry): void {
  if (!file.json) file.json = { version: '5.0.1', flags: {}, shapes: [], imagePath: file.name, imageData: null, imageHeight: 0, imageWidth: 0 };
  if (!file.json.shapes) file.json.shapes = [];
}
function getShapes(file: FileEntry): LabelMeShape[] { ensureJson(file); return file.json!.shapes; }
function saveToStorage(file: FileEntry): void {
  if (file.json && _sessionId) Storage.saveJson(_sessionId, file.name, file.json);
}
function addShape(file: FileEntry, shape: LabelMeShape): void { ensureJson(file); file.json!.shapes.push(shape); file.modified = true; saveToStorage(file); }
function removeShape(file: FileEntry, idx: number): void { ensureJson(file); file.json!.shapes.splice(idx, 1); file.modified = true; saveToStorage(file); }
function updateShape(file: FileEntry, idx: number, shape: LabelMeShape): void { ensureJson(file); file.json!.shapes[idx] = shape; file.modified = true; saveToStorage(file); }

function collectAllLabels(): string[] {
  const set = new Set<string>();
  for (const f of _files) {
    if (!f.json || !f.json.shapes) continue;
    for (const s of f.json.shapes) { if (s.label) set.add(s.label); }
  }
  return [...set].sort();
}

function makeRectShape(label: string, x1: number, y1: number, x2: number, y2: number, imgW: number, imgH: number): LabelMeShape {
  const cx1 = Math.max(0, Math.min(imgW, Math.min(x1, x2)));
  const cy1 = Math.max(0, Math.min(imgH, Math.min(y1, y2)));
  const cx2 = Math.max(0, Math.min(imgW, Math.max(x1, x2)));
  const cy2 = Math.max(0, Math.min(imgH, Math.max(y1, y2)));
  return { label, points: [[cx1, cy1],[cx2, cy2]], group_id: null, shape_type: 'rectangle', flags: {} };
}

export const DataManager = {
  loadFromFileList, loadFromZip,
  getSessionId,
  count, index, current, goTo, next, prev,
  getShapes, addShape, removeShape, updateShape,
  collectAllLabels, makeRectShape,
  get files(): FileEntry[] { return _files; },
};

export default DataManager;