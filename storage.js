/**
 * storage.js – ローカル永続化（Cookie / localStorage フォールバック）
 * ラベルカラー・確認済みフラグを保存
 */
const Storage = (() => {
  const PREFIX = 'lme_';

  // localStorage ラッパー（エラー時はメモリ）
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

  // ─── Label Colors ───────────────────────────────────────────
  // colors: { labelName: "#rrggbb" }
  const DEFAULT_PALETTE = [
    '#e94560','#4f8fff','#3ecf6e','#f0a030','#c084fc',
    '#06b6d4','#f97316','#a3e635','#fb7185','#818cf8'
  ];
  let _colorIdx = 0;

  function getLabelColors() {
    return get('label_colors', {});
  }

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

  // ─── Confirmed Files ────────────────────────────────────────
  // confirmed: Set of filenames
  function getConfirmed() {
    return new Set(get('confirmed', []));
  }

  function setConfirmed(filename, val) {
    const s = getConfirmed();
    if (val) s.add(filename); else s.delete(filename);
    set('confirmed', [...s]);
  }

  function isConfirmed(filename) {
    return getConfirmed().has(filename);
  }

  // ─── JSON Data ──────────────────────────────────────────────
  function saveJson(filename, json) {
    set('json_' + filename, json);
  }
  
  function getJson(filename) {
    return get('json_' + filename, null);
  }

  return { set, get, del, getLabelColors, setLabelColor, getOrAssignColor, removeLabelColor, getConfirmed, setConfirmed, isConfirmed, saveJson, getJson };
})();