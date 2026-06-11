<!-- Copyright (c) 2026 DTT-JP. Released under the MIT license. -->
# Phase 03 — サイドバースワイプ展開ドロワー化（進捗・ズーム）

**対象ファイル:** `index.html`, `app.js`, `style.css`  
**難易度:** ★★★  
**前提フェーズ:** なし（Phase 04 より先に着手推奨）

---

## 概要

現在のサイドバーにある「進捗→」「ズーム→」は別パネルに飛び出す**フライアウト**形式だが、  
仕様では以下に変更する：

1. **進捗サマリー** → 「確認・選択・追加」エリアの横に小テキストで常時表示  
   → エリアを**右スワイプで展開**して詳細を見るドロワー形式

2. **ズーム操作** → 「100% ・ 中心」ボタンのエリアを**右スワイプで展開**  
   → `+` / `−` ボタンと `%` 表示・`100%` ・`中心`ボタンをすべて同じ高さ・幅で配置

---

## 現状

- `flyoutZoom` / `flyoutProgress` が `#flyoutZoom` / `#flyoutProgress` として `index.html` に存在
- `app.js` の `openFlyout()` / `closeFlyout()` で管理

---

## 設計方針

フライアウトパネルへの遷移をやめ、**インラインエクスパンド**（サイドバー内でその場に展開）に変更。  
スワイプ操作は `touchstart` + `touchend` の X 方向の差で判定する。

---

## 実装手順

### 1. `index.html` — 「確認・選択・追加」行の構造変更

**現状:**

```html
<div class="action-row">
  <button class="act-btn confirm-btn" id="btnConfirm">...</button>
  <button class="act-btn mode-btn active" id="btnModeSelect">...</button>
  <button class="act-btn mode-btn" id="btnModeAdd">...</button>
  <button class="act-btn expand-btn" id="btnProgress">...</button>
</div>
```

**変更後:**

```html
<div class="action-section" id="actionSection">
  <!-- メイン行（常時表示） -->
  <div class="action-row">
    <button class="act-btn confirm-btn" id="btnConfirm">...</button>
    <button class="act-btn mode-btn active" id="btnModeSelect">...</button>
    <button class="act-btn mode-btn" id="btnModeAdd">...</button>
    <!-- 進捗ミニ表示 -->
    <span class="progress-mini" id="progressMini">0/0</span>
  </div>
  <!-- 展開パネル（スワイプで表示） -->
  <div class="action-expand hidden" id="actionExpand">
    <div class="progress-stats-inline">
      <div class="stat"><span id="statTotal2">0</span><label>全</label></div>
      <div class="stat"><span id="statDone2">0</span><label>確認済</label></div>
      <div class="stat"><span id="statLeft2">0</span><label>残り</label></div>
    </div>
  </div>
</div>
```

### 2. `index.html` — ズーム行の構造変更

**現状:**

```html
<div class="view-row">
  <button class="view-btn" id="btnZoomReset">100%</button>
  <button class="view-btn" id="btnZoomCenter">中心</button>
  <button class="view-btn expand-btn" id="btnZoomPanel">...</button>
</div>
```

**変更後:**

```html
<div class="zoom-section" id="zoomSection">
  <!-- メイン行（常時表示） -->
  <div class="view-row">
    <button class="view-btn" id="btnZoomReset">100%</button>
    <button class="view-btn" id="btnZoomCenter">中心</button>
  </div>
  <!-- 展開パネル（スワイプで表示） -->
  <div class="zoom-expand hidden" id="zoomExpand">
    <div class="zoom-expand-row">
      <button class="zoom-exp-btn" id="btnZoomOut2">−</button>
      <input type="number" id="zoomInput2" value="100" min="10" max="800" class="zoom-exp-input">
      <span class="zoom-exp-pct">%</span>
      <button class="zoom-exp-btn" id="btnZoomIn2">＋</button>
      <button class="zoom-exp-btn" id="btnZoomReset3">100%</button>
      <button class="zoom-exp-btn" id="btnZoomCenter3">中心</button>
    </div>
  </div>
</div>
```

### 3. `app.js` — スワイプジェスチャー検知

スワイプ判定を汎用関数として実装：

```js
function addSwipeExpand(sectionId, expandId) {
  const section = document.getElementById(sectionId);
  const expand  = document.getElementById(expandId);
  let startX = null;

  section.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  section.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (dx > 30)  { expand.classList.remove('hidden'); }  // 右スワイプ → 展開
    if (dx < -30) { expand.classList.add('hidden'); }     // 左スワイプ → 閉じる
  }, { passive: true });
}
```

`bindEvents()` 内で呼び出し：

```js
addSwipeExpand('actionSection', 'actionExpand');
addSwipeExpand('zoomSection', 'zoomExpand');
```

### 4. `app.js` — 進捗ミニ表示の更新

```js
function updateProgressMini() {
  const total = DataManager.count();
  const done  = [...Storage.getConfirmed()].filter(
    name => DataManager.files.some(f => f.name === name)
  ).length;
  document.getElementById('progressMini').textContent = `${done}/${total}`;
}
```

`updateProgressStats()` 末尾で `updateProgressMini()` を呼ぶ。

### 5. `app.js` — ズーム展開パネルのイベントバインド

```js
// 展開パネルのボタン
$('btnZoomOut2').addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomOut()));
$('btnZoomIn2').addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomIn()));
$('zoomInput2').addEventListener('change', () => {
  // zoomInput と同じロジック
});
$('btnZoomReset3').addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
$('btnZoomCenter3').addEventListener('click', () => CanvasManager.centerImage());
```

`updateZoomDisplay()` を修正して `zoomInput2` にも反映：

```js
function updateZoomDisplay(zoom) {
  const pct = Math.round(zoom * 100);
  els.zoomInput.value  = pct;
  const z2 = document.getElementById('zoomInput2');
  if (z2) z2.value = pct;
}
```

### 6. `style.css` — スタイル追加

```css
/* 進捗ミニ表示 */
.progress-mini {
  font-size: 10px;
  color: var(--text3);
  flex-shrink: 0;
  min-width: 28px;
  text-align: right;
}

/* インライン展開パネル共通 */
.action-expand,
.zoom-expand {
  overflow: hidden;
  transition: max-height .25s ease, opacity .2s;
  max-height: 0;
  opacity: 0;
}
.action-expand:not(.hidden),
.zoom-expand:not(.hidden) {
  max-height: 120px;
  opacity: 1;
}

/* ズーム展開行 */
.zoom-expand-row {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
}
.zoom-exp-btn {
  flex: 1;
  height: 34px;
  /* view-btn と同じスタイルを継承 */
}
.zoom-exp-input {
  flex: 1.5;
  height: 34px;
  text-align: center;
  /* zoom-input と同じスタイルを継承 */
}

/* インライン進捗 */
.progress-stats-inline {
  display: flex;
  gap: 6px;
  padding: 4px 0;
}
.progress-stats-inline .stat {
  flex: 1;
  text-align: center;
  font-size: 11px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  padding: 6px 4px;
}
```

### 7. フライアウトパネルの削除・整理

`index.html` から `#flyoutZoom` と `#flyoutProgress` の HTML を削除。  
`app.js` の `FLYOUTS` から `zoom` と `progress` のエントリを削除。  
`style.css` のフライアウト関連スタイルは `objects` と `other` のために残す。

---

## 注意点

- `els.zoomInput` / `els.statTotal` 等の既存の DOM 参照はそのまま残し、`zoomInput2` 等を追加する形にする
- フライアウトが廃止されるため `btnZoomPanel` と `btnProgress` ボタンは削除 or 非表示
- iPad での右スワイプはブラウザの「戻る」ジェスチャーと競合する可能性があるため、  
  Phase 10「ペン設定」の「ブラウザジェスチャーを無効化」トグルと連携して対処

---

## テスト確認項目

- [ ] 「確認・選択・追加」行を右スワイプすると進捗詳細が展開される
- [ ] 左スワイプまたは展開後に外タップで閉じる
- [ ] ズーム行を右スワイプすると +/− と % 入力が展開される
- [ ] 展開ズームのボタンが 100% / 中心 と同じ高さ・幅になっている
- [ ] 進捗ミニ表示が常時 `確認済/全枚数` を表示している
