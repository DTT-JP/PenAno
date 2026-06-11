<!-- Copyright (c) 2026 DTT-JP. Released under the MIT license. -->
# Phase 06〜11 — メニュー各セクション実装

> Phase 04・05 完了後に着手する。
> 各 Phase は独立して実装可能だが、**Phase 07（表示設定）を先行**すると CSS 変数基盤が整い後続が楽になる。

---

## Phase 06 — セッション管理

**対象:** `index.html`（menuSec-session）, `app.js`, `storage.js`  
**難易度:** ★★★

### 概要

- 複数回のフォルダ/ZIP読み込みを「セッション」として localStorage に記録
- セッション一覧を表示し、セッション間でラベル一覧をコピーできる

### `storage.js` への追加

```js
// セッション一覧の保存構造
// key: 'sessions' → [{ id, name, labels:{}, confirmed:[], createdAt, isCurrent }]

function getSessions() { return get('sessions', []); }
function saveSessions(sessions) { set('sessions', sessions); }
function createSession(name) { /* 新セッションを追加 */ }
function getCurrentSessionId() { return get('current_session_id', null); }
function setCurrentSessionId(id) { set('current_session_id', id); }
```

### UI 構造

```
[ セッション一覧リスト（スクロール可） ]
  ┌─────────────────────────────────┐
  │ 📁 dataset_20260611.zip  [現在] │
  │   ボタン: ラベル書き出し / 削除 │
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │ 📁 old_dataset.zip              │
  │   ボタン: ラベルを現在へコピー  │
  └─────────────────────────────────┘
```

### データ読み込み時の処理

`onDataLoaded()` 内でセッション登録を行う：

```js
function onDataLoaded() {
  // ... 既存処理 ...
  const sessionName = DataManager.files[0]?.name || 'session_' + Date.now();
  Storage.createSession(sessionName);
  // ...
}
```

---

## Phase 07 — 表示設定

**対象:** `index.html`（menuSec-display）, `app.js`, `style.css`, `storage.js`  
**難易度:** ★★★

### CSS 変数一覧（追加分）

```css
:root {
  /* テーマ */
  --theme: dark; /* light | dark | black */

  /* 表示設定 */
  --ui-scale: 1.0;
  --crosshair-color: rgba(255,255,255,0.6);
  --crosshair-width: 1;
  --annot-fill-opacity: 0.2;
  --annot-stroke-width: 1.5;
  --handle-size: 8;
  --img-brightness: 1.0;
  --img-contrast: 1.0;
}
```

### テーマ実装

`data-theme` 属性を `<html>` に設定し、CSS で分岐：

```css
[data-theme="light"] { --bg: #f4f6fb; --text: #0d0d14; /* ... */ }
[data-theme="black"] { --bg: #000; --bg2: #0a0a0a; /* ... */ }
```

### 利き手（UI反転）

```css
[data-handedness="left"] .app { flex-direction: row-reverse; }
[data-handedness="left"] .flyout-panel { left: auto; right: var(--sidebar-w); }
```

### 画像フィルター

```css
#mainCanvas {
  filter: brightness(var(--img-brightness)) contrast(var(--img-contrast));
}
```

### スライダーUI コンポーネント

```html
<!-- 再利用可能なスライダーコンポーネント -->
<div class="menu-slider-field">
  <div class="menu-slider-header">
    <label class="menu-field-label">塗りつぶしの濃さ</label>
    <span class="menu-slider-val" id="fillOpacityVal">20%</span>
  </div>
  <input type="range" min="0" max="100" value="20"
         class="menu-slider" id="fillOpacitySlider">
</div>
```

### `storage.js` への追加

```js
function getDisplaySettings() {
  return get('display_settings', {
    theme: 'dark',
    handedness: 'right',
    uiScale: 1.0,
    showAnnotations: true,
    showLabelNames: false,
    showMinimap: false,
    crosshairWidth: 1,
    crosshairColor: 'auto',
    fillOpacity: 0.2,
    strokeWidth: 1.5,
    handleSize: 8,
    imgBrightness: 1.0,
    imgContrast: 1.0,
  });
}
function setDisplaySetting(key, val) {
  const s = getDisplaySettings();
  s[key] = val;
  set('display_settings', s);
  applyDisplaySettings(s);
}
```

---

## Phase 08 — 動作と保存設定

**対象:** `app.js`, `canvas.js`, `storage.js`, `index.html`（menuSec-behavior）  
**難易度:** ★★★

### 設定項目と実装箇所

| 設定 | 実装箇所 |
|------|---------|
| ズーム倍率を引き継ぐ | `showCurrentImage()` でズームリセットをスキップ |
| スクロール位置を引き継ぐ | `showCurrentImage()` で `centerImage()` をスキップ |
| 選択ラベルを引き継ぐ | `showCurrentImage()` で `_activeLabel` をリセットしない |
| 追加後に選択モードへ戻す | `handleShapesChanged` の `addShape` 分岐 |
| 吸着（スナップ） | `canvas.js` の `onPointerMove` に吸着ロジック追加 |
| 画像外補正 | `makeRectShape` で既に実装済み（ON/OFF 化のみ） |
| 小さすぎるラベル無視 | `onPointerUp` / `onTouchEnd` の描画完了時にサイズチェック |
| ページ離脱警告 | `window.addEventListener('beforeunload', ...)` |
| 大きすぎるZIP警告 | `onZipSelected` でファイルサイズチェック |
| すべてのデータを削除 | `localStorage.clear()` + 確認ダイアログ |

### `storage.js` への追加

```js
function getBehaviorSettings() {
  return get('behavior_settings', {
    keepZoom: false,
    keepPosition: false,
    keepLabel: false,
    returnToSelectAfterAdd: false,
    snapSameLabel: false,
    snapOtherLabel: false,
    autoClipToBounds: true,
    minShapeSize: 0,
    warnOnClose: true,
    warnZipSizeMb: 0,
  });
}
```

---

## Phase 09 — ユーザー補助設定

**対象:** `app.js`, `style.css`, `storage.js`, `index.html`（menuSec-accessibility）  
**難易度:** ★★☆

### カラープロファイル

```js
const COLOR_PROFILES = {
  standard: null,  // デフォルトパレット（変更なし）
  cud: [           // カラーユニバーサルデザイン推奨色
    '#ff4b00', '#fff100', '#03af7a', '#005aff',
    '#4dc4ff', '#ff8082', '#f6aa00', '#990099',
  ],
  highContrast: [  // 高コントラスト
    '#ffffff', '#ffff00', '#00ff00', '#00ffff',
    '#ff00ff', '#ff0000', '#0080ff', '#ff8000',
  ],
};
```

### 塗りつぶしパターン

SVG の `<pattern>` 要素を `<defs>` に追加し、fill として参照：

```js
function createFillPattern(type) {
  // 'none' | 'hatch' | 'dot'
  // SVG defs にパターンを登録し、ID を返す
}
```

### UI文字サイズ

```css
[data-text-size="large"]  { font-size: 15px; }
[data-text-size="xlarge"] { font-size: 18px; }
```

---

## Phase 10 — ペンと入力設定

**対象:** `canvas.js`, `app.js`, `index.html`（menuSec-pen）  
**難易度:** ★★★

### 入力診断コンポーネント

```js
// PointerEvent のプロパティをリアルタイム表示
function initInputDiagnostics(containerEl) {
  const diagnostics = {
    hasTouch: 'ontouchstart' in window,
    hasPen: false,
    penHover: false,
    penPressure: false,
    penTilt: false,
    penRotation: false,
    penButtons: 0,
    hasEraser: false,
    currentType: 'unknown',
  };

  containerEl.addEventListener('pointermove', e => {
    diagnostics.currentType = e.pointerType;
    if (e.pointerType === 'pen') {
      diagnostics.hasPen = true;
      if (e.buttons === 0) diagnostics.penHover = true;
      if (e.pressure > 0) diagnostics.penPressure = true;
      if (e.tiltX !== 0 || e.tiltY !== 0) diagnostics.penTilt = true;
      if (e.twist !== 0) diagnostics.penRotation = true;
    }
    renderDiagnostics(containerEl, diagnostics);
  });
}
```

### `canvas.js` への追加

- ペン設定に応じて `isLabeling(e)` ヘルパーで各入力タイプを許可/拒否
- 消しゴム（`e.buttons === 32`）での削除
- パームリジェクション（ペン使用中のタッチ無視）

```js
function shouldHandleAsDrawing(e) {
  const s = Storage.getPenSettings();
  if (e.pointerType === 'pen'   && !s.penLabeling)   return false;
  if (e.pointerType === 'touch' && !s.touchLabeling) return false;
  if (e.pointerType === 'mouse' && !s.mouseLabeling) return false;
  return true;
}
```

---

## Phase 11 — アプリ情報セクション

**対象:** `index.html`（menuSec-app）, `app.js`  
**難易度:** ★★☆

### 構成

```html
<section class="menu-section" id="menuSec-app">
  <h2 class="menu-sec-title">アプリ</h2>

  <!-- バージョン情報 -->
  <div class="menu-group">
    <div class="menu-group-label">アプリ情報</div>
    <div class="menu-info-row">
      <span class="menu-info-label">バージョン</span>
      <span class="menu-info-val" id="appVersionDisplay">—</span>
    </div>
    <div class="menu-info-row">
      <span class="menu-info-label">リリース日</span>
      <span class="menu-info-val" id="appDateDisplay">—</span>
    </div>
  </div>

  <!-- 端末情報 -->
  <div class="menu-group">
    <div class="menu-group-label">この端末の対応状況</div>
    <div class="menu-info-row">
      <span class="menu-info-label">ペン入力</span>
      <span class="menu-info-val device-cap" id="capPen">—</span>
    </div>
    <div class="menu-info-row">
      <span class="menu-info-label">タッチパネル</span>
      <span class="menu-info-val device-cap" id="capTouch">—</span>
    </div>
  </div>

  <!-- リリースノート（埋め込み） -->
  <div class="menu-group">
    <div class="menu-group-label">リリースノート</div>
    <div id="appReleaseNotes" class="md-content">読み込み中...</div>
  </div>

  <!-- PWAインストール -->
  <div class="menu-group" id="pwaInstallGroup" style="display:none">
    <button class="menu-action-btn" id="btnPwaInstall">
      アプリを追加（ホーム画面）
    </button>
  </div>
  <!-- iOS/Firefox向け手順 -->
  <div class="menu-group" id="pwaGuideGroup" style="display:none">
    <div class="menu-group-label">アプリの追加方法</div>
    <p id="pwaGuideText" style="font-size:13px;color:var(--text2);line-height:1.7;"></p>
  </div>

  <!-- リンク -->
  <div class="menu-group">
    <a class="menu-link-btn" href="#" id="linkHelp" target="_blank">ヘルプ</a>
    <a class="menu-link-btn" id="linkGitHub" target="_blank" rel="noopener">
      GitHubを開く
    </a>
    <button class="menu-action-btn" id="btnLegal">法的表示</button>
  </div>
</section>
```

### PWAインストール判定

```js
let _deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  $('pwaInstallGroup').style.display = '';
});

$('btnPwaInstall').addEventListener('click', async () => {
  if (!_deferredPrompt) return;
  _deferredPrompt.prompt();
  await _deferredPrompt.userChoice;
  _deferredPrompt = null;
});

// iOS Safari / Firefox 向け案内
const ua = navigator.userAgent;
const isIOS = /iP(ad|hone|od)/.test(ua);
const isFirefox = /Firefox/.test(ua);
if ((isIOS || isFirefox) && !window.navigator.standalone) {
  $('pwaGuideGroup').style.display = '';
  $('pwaGuideText').textContent = isIOS
    ? 'Safari の共有ボタン（□↑）をタップ → 「ホーム画面に追加」を選択してください。'
    : 'Firefox では PWA のインストールに対応していません。Safari または Chrome をご利用ください。';
}
```

### 既存バージョンモーダルの統合

旧 `#modalVersion` は Phase 11 完了後に廃止し、  
`menuSec-app` の「リリースノート」エリアに埋め込む。

---

## 共通 CSS（Phase 07〜11 で使い回す）

```css
/* 情報行 */
.menu-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.menu-info-label { color: var(--text2); }
.menu-info-val { color: var(--text); font-weight: 600; }

/* リンクボタン */
.menu-link-btn {
  display: block;
  width: 100%;
  padding: 10px 14px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--accent-h);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 6px;
  transition: background .15s;
}
.menu-link-btn:active { background: var(--surface); }

/* デバイス対応バッジ */
.device-cap { font-size: 12px; }
.device-cap.supported { color: var(--success); }
.device-cap.unsupported { color: var(--text3); }
```
