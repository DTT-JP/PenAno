/**
 * storage.js – ローカル永続化（localStorage フォールバック）
 */
const Storage = (() => {
  const PREFIX = 'lme_';
  const mem = {};
  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch(e) { mem[key] = value; }
  }
  function get(key, def = null) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v !== null ? JSON.parse(v) : def;
    } catch(e) { return key in mem ? mem[key] : def; }
  }
  function del(key) {
    try { localStorage.removeItem(PREFIX + key); } catch(e) { delete mem[key]; }
  }

  const DEFAULT_PALETTE = [
    '#2563eb','#3b82f6','#22c55e','#f59e0b','#a855f7',
    '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'
  ];

  function getLabelColors() { return get('label_colors', {}); }
  function setLabelColor(label, color) {
    const colors = getLabelColors();
    colors[label] = color;
    set('label_colors', colors);
  }
  function getOrAssignColor(label) {
    const colors = getLabelColors();
    if (colors[label]) return colors[label];
    const assigned = Object.keys(colors).length;
    const color = DEFAULT_PALETTE[assigned % DEFAULT_PALETTE.length];
    setLabelColor(label, color);
    return color;
  }
  function removeLabelColor(label) {
    const colors = getLabelColors();
    delete colors[label];
    set('label_colors', colors);
  }

  function getConfirmed() { return new Set(get('confirmed', [])); }
  function setConfirmed(filename, val) {
    const s = getConfirmed();
    if (val) s.add(filename); else s.delete(filename);
    set('confirmed', [...s]);
  }
  function isConfirmed(filename) { return getConfirmed().has(filename); }

  function saveJson(filename, json) { set('json_' + filename, json); }
  function getJson(filename) { return get('json_' + filename, null); }

  return { set, get, del, getLabelColors, setLabelColor, getOrAssignColor, removeLabelColor, getConfirmed, setConfirmed, isConfirmed, saveJson, getJson };
})();
