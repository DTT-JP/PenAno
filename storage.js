/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * storage.js – ローカル永続化（セッションスコープ付き）
 *
 * セッションとは「一回のフォルダ/ZIP読み込み」のこと。
 * セッションIDは  "folder:<name>"  または  "zip:<name>"  の文字列。
 * すべてのキーに  PREFIX + sessionId + ':' を付けて名前空間を分離する。
 *
 * セッション一覧は  lme_sessions  に JSON 配列で保存する。
 *   [{ id, displayName, type, createdAt }, ...]
 */
const Storage = (() => {
  const PREFIX = 'lme_';

  /* ── 低レベル helpers ──────────────────────────────────── */
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
  function _del(sessionId, key) {
    try { localStorage.removeItem(_key(sessionId, key)); } catch(e) {}
  }

  /* ── セッション管理 ────────────────────────────────────── */
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

  /**
   * 新しいセッションを登録してIDを返す。
   * IDは  type:name:count<N>:size<S>  の形式。
   * 同じフォルダ/ZIPを再度開いたとき、ファイル数・総サイズが一致すれば
   * 同じIDが返り、保存済みデータを引き継げる。
   *
   * @param {'folder'|'zip'} type
   * @param {string} name          フォルダ名 or ZIPファイル名
   * @param {number} imgCount      画像ファイルの数
   * @param {number} totalSize     画像ファイルの総バイトサイズ
   */
  function registerSession(type, name, imgCount, totalSize) {
    const id = type + ':' + name + ':count' + imgCount + ':size' + totalSize;
    const list = _getSessions();
    if (!list.find(s => s.id === id)) {
      list.push({ id, displayName: name, type, createdAt: Date.now() });
      _saveSessions(list);
    }
    return id;
  }

  function getSessions() { return _getSessions(); }

  /** 指定セッションのすべてのキーを削除 */
  function deleteSession(sessionId) {
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

  /* ── カラー ────────────────────────────────────────────── */
  const DEFAULT_PALETTE = [
    '#2563eb','#3b82f6','#22c55e','#f59e0b','#a855f7',
    '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'
  ];

  function getLabelColors(sessionId) { return _get(sessionId, 'label_colors', {}); }
  function setLabelColor(sessionId, label, color) {
    const colors = getLabelColors(sessionId);
    colors[label] = color;
    _set(sessionId, 'label_colors', colors);
  }
  function getOrAssignColor(sessionId, label) {
    const colors = getLabelColors(sessionId);
    if (colors[label]) return colors[label];
    const assigned = Object.keys(colors).length;
    const color = DEFAULT_PALETTE[assigned % DEFAULT_PALETTE.length];
    setLabelColor(sessionId, label, color);
    return color;
  }
  function removeLabelColor(sessionId, label) {
    const colors = getLabelColors(sessionId);
    delete colors[label];
    _set(sessionId, 'label_colors', colors);
  }
  /** セッションのラベルカラー全体を上書きマージ（コピー用）*/
  function mergeLabelColors(sessionId, colorsObj) {
    const existing = getLabelColors(sessionId);
    const merged = { ...colorsObj, ...existing }; // 既存優先
    _set(sessionId, 'label_colors', merged);
  }

  /* ── 確認フラグ ────────────────────────────────────────── */
  function getConfirmed(sessionId) { return new Set(_get(sessionId, 'confirmed', [])); }
  function setConfirmed(sessionId, filename, val) {
    const s = getConfirmed(sessionId);
    if (val) s.add(filename); else s.delete(filename);
    _set(sessionId, 'confirmed', [...s]);
  }
  function isConfirmed(sessionId, filename) { return getConfirmed(sessionId).has(filename); }

  /* ── JSON 保存 ─────────────────────────────────────────── */
  function saveJson(sessionId, filename, json) { _set(sessionId, 'json_' + filename, json); }
  function getJson(sessionId, filename) { return _get(sessionId, 'json_' + filename, null); }

  /* ── 旧形式マイグレーション（グローバルキーを読み取る） ─── */
  /**
   * 旧バージョン（セッションなし）で保存されたデータを
   * 指定セッションに移行する。一度実行したら旧キーは消さない
   * （他セッションで参照されている可能性があるため）。
   * 返り値: migrated file count
   */
  function migrateLegacy(sessionId, fileNames) {
    let count = 0;
    for (const name of fileNames) {
      const legacyKey = PREFIX + 'json_' + name;
      try {
        const v = localStorage.getItem(legacyKey);
        if (v !== null) {
          const parsed = JSON.parse(v);
          // 新形式キーに書き込む（既にある場合は上書きしない）
          const newKey = _key(sessionId, 'json_' + name);
          if (!localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, v);
            count++;
          }
        }
      } catch(e) {}
    }
    // legacy label_colors
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

  return {
    // session
    registerSession, getSessions, deleteSession,
    // colors
    getLabelColors, setLabelColor, getOrAssignColor, removeLabelColor, mergeLabelColors,
    // confirmed
    getConfirmed, setConfirmed, isConfirmed,
    // json
    saveJson, getJson,
    // migration
    migrateLegacy,
  };
})();