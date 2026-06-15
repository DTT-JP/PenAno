/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * storage.js – ローカル永続化（セッションスコープ付き）
 */
const PREFIX = 'lme_';

function _key(sessionId, key) {
  return PREFIX + sessionId + ':' + key;
}
function _set(sessionId, key, value) {
  try { localStorage.setItem(_key(sessionId, key), JSON.stringify(value)); } catch(e) {}
}
function _get(sessionId, key, def = null) {
  try {
    const v = localStorage.getItem(_key(sessionId, key));
    return v !== null ? JSON.parse(v) : def;
  } catch(e) { return def; }
}

const SESSIONS_KEY = PREFIX + 'sessions';

function _getSessions() {
  try {
    const v = localStorage.getItem(SESSIONS_KEY);
    return v ? JSON.parse(v) : [];
  } catch(e) { return []; }
}
function _saveSessions(list) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(list)); } catch(e) {}
}

export function registerSession(type, name, imgCount, totalSize) {
  const id = type + ':' + name + ':count' + imgCount + ':size' + totalSize;
  const list = _getSessions();
  if (!list.find(s => s.id === id)) {
    list.push({ id, displayName: name, type, createdAt: Date.now() });
    _saveSessions(list);
  }
  return id;
}

export function getSessions() { return _getSessions(); }

export function deleteSession(sessionId) {
  const prefix = PREFIX + sessionId + ':';
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
  const list = _getSessions().filter(s => s.id !== sessionId);
  _saveSessions(list);
}

const DEFAULT_PALETTE = [
  '#2563eb','#3b82f6','#22c55e','#f59e0b','#a855f7',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'
];

export function getLabelColors(sessionId) { return _get(sessionId, 'label_colors', {}); }
export function setLabelColor(sessionId, label, color) {
  const colors = getLabelColors(sessionId);
  colors[label] = color;
  _set(sessionId, 'label_colors', colors);
}
export function getOrAssignColor(sessionId, label) {
  const colors = getLabelColors(sessionId);
  if (colors[label]) return colors[label];
  const assigned = Object.keys(colors).length;
  const color = DEFAULT_PALETTE[assigned % DEFAULT_PALETTE.length];
  setLabelColor(sessionId, label, color);
  return color;
}
export function removeLabelColor(sessionId, label) {
  const colors = getLabelColors(sessionId);
  delete colors[label];
  _set(sessionId, 'label_colors', colors);
}
export function mergeLabelColors(sessionId, colorsObj) {
  const existing = getLabelColors(sessionId);
  const merged = { ...colorsObj, ...existing };
  _set(sessionId, 'label_colors', merged);
}

export function getConfirmed(sessionId) { return new Set(_get(sessionId, 'confirmed', [])); }
export function setConfirmed(sessionId, filename, val) {
  const s = getConfirmed(sessionId);
  if (val) s.add(filename); else s.delete(filename);
  _set(sessionId, 'confirmed', [...s]);
}
export function isConfirmed(sessionId, filename) { return getConfirmed(sessionId).has(filename); }

export function saveJson(sessionId, filename, json) { _set(sessionId, 'json_' + filename, json); }
export function getJson(sessionId, filename) { return _get(sessionId, 'json_' + filename, null); }

export function migrateLegacy(sessionId, fileNames) {
  let count = 0;
  for (const name of fileNames) {
    const legacyKey = PREFIX + 'json_' + name;
    try {
      const v = localStorage.getItem(legacyKey);
      if (v !== null) {
        const newKey = _key(sessionId, 'json_' + name);
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, v);
          count++;
        }
      }
    } catch(e) {}
  }
  try {
    const lc = localStorage.getItem(PREFIX + 'label_colors');
    if (lc) {
      const newKey = _key(sessionId, 'label_colors');
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, lc);
      }
    }
  } catch(e) {}
  return count;
}

// Namespace export for legacy-style usage patterns
export const Storage = {
  registerSession, getSessions, deleteSession,
  getLabelColors, setLabelColor, getOrAssignColor, removeLabelColor, mergeLabelColors,
  getConfirmed, setConfirmed, isConfirmed,
  saveJson, getJson,
  migrateLegacy,
};

export default Storage;
