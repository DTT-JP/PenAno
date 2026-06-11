<!-- Copyright (c) 2026 DTT-JP. Released under the MIT license. -->
# Phase 01 — ホバー・カーソル十字線の実装

**対象ファイル:** `canvas.js`, `style.css`  
**難易度:** ★★☆  
**前提フェーズ:** なし（単独実装可）

---

## 概要

ペンのホバーおよびマウスカーソル位置から、**上下左右に点線を画面端まで伸ばす**十字線を表示する。

---

## 現状の問題

- `canvas.js` にはホバー検知のコードが存在しない
- SVG オーバーレイ（`#annotSvg`）はアノテーション描画にのみ使用されており、カーソル補助線は未実装

---

## 実装方針

### 方法の選択

**SVG に crosshair 要素を追加する方式**を採用。  
Canvas 再描画よりコストが低く、既存の `annotSvg` と共存しやすい。

---

## 実装手順

### 1. `canvas.js` — ホバーイベントの追加

`init()` 内に以下を追加：

```js
// ホバー（ペン/マウス）
area.addEventListener('pointermove', onPointerMoveForCrosshair, { passive: true });
area.addEventListener('pointerleave', hideCrosshair, { passive: true });
```

### 2. `canvas.js` — crosshair 要素の生成

`init()` 内で SVG に `<line>` 要素を4本生成し、変数に保持：

```js
let _crosshairH = null; // 横線
let _crosshairV = null; // 縦線

function initCrosshair() {
  _crosshairH = createSvgLine('crosshair-h');
  _crosshairV = createSvgLine('crosshair-v');
  svg.appendChild(_crosshairH);
  svg.appendChild(_crosshairV);
}

function createSvgLine(cls) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  el.setAttribute('class', cls);
  el.style.display = 'none';
  return el;
}
```

### 3. `canvas.js` — crosshair の更新ロジック

```js
function onPointerMoveForCrosshair(e) {
  // タッチ（指）はスキップ
  if (e.pointerType === 'touch' && e.touchType !== 'stylus') return;

  const { x: ix, y: iy } = screenToImage(e.clientX, e.clientY);

  // 画像外ではクロスヘア非表示
  if (ix < 0 || ix > _imgW || iy < 0 || iy > _imgH) {
    hideCrosshair();
    return;
  }

  // 横線: 画像左端→右端、Y固定
  _crosshairH.setAttribute('x1', 0);
  _crosshairH.setAttribute('y1', iy);
  _crosshairH.setAttribute('x2', _imgW);
  _crosshairH.setAttribute('y2', iy);
  _crosshairH.style.display = '';

  // 縦線: 画像上端→下端、X固定
  _crosshairV.setAttribute('x1', ix);
  _crosshairV.setAttribute('y1', 0);
  _crosshairV.setAttribute('x2', ix);
  _crosshairV.setAttribute('y2', _imgH);
  _crosshairV.style.display = '';
}

function hideCrosshair() {
  if (_crosshairH) _crosshairH.style.display = 'none';
  if (_crosshairV) _crosshairV.style.display = 'none';
}
```

> `screenToImage()` は既存関数をそのまま流用。

### 4. `canvas.js` — `renderAnnotations()` との競合回避

`renderAnnotations()` は `svg.firstChild` を全削除してから再描画するため、  
crosshair 要素が消えてしまう。対策：

- crosshair 要素を `<g id="crosshair-layer">` にまとめ、`renderAnnotations()` の削除対象から除外する

```js
// renderAnnotations() の先頭:
while (svg.firstChild && svg.firstChild.id !== 'crosshair-layer') {
  svg.removeChild(svg.firstChild);
}
// または crosshair を svg の最後に appendChild し直す方式でも可
```

### 5. `style.css` — 点線スタイルの追加

```css
/* 十字カーソル線 */
.crosshair-h,
.crosshair-v {
  stroke: var(--crosshair-color, rgba(255, 255, 255, 0.6));
  stroke-width: calc(var(--crosshair-width, 1) * 1px / var(--zoom, 1));
  stroke-dasharray: calc(6px / var(--zoom, 1)) calc(4px / var(--zoom, 1));
  pointer-events: none;
}
```

> Phase 10「ペンと入力」設定で `--crosshair-color` と `--crosshair-width` を動的に変更できるようにする。  
> Phase 07「表示」設定でも同様にスライダーから変更できる。

---

## 注意点

- `onPointerMoveForCrosshair` は `_drag` 中も動作させてよい（描画中も十字線表示）
- ズーム変化時に `stroke-dasharray` の見た目が変わるため、`--zoom` CSS変数をズーム更新時に `document.documentElement.style.setProperty('--zoom', _zoom)` で更新する
- Phase 07 の設定で「十字カーソルの太さ = 0」のとき `hideCrosshair()` を呼ぶよう制御

---

## テスト確認項目

- [ ] マウス移動で十字線が表示される
- [ ] ペンホバーで十字線が表示される
- [ ] 指タッチでは十字線が出ない
- [ ] 画像外に出ると十字線が消える
- [ ] `renderAnnotations()` 呼び出し後も十字線が残る
- [ ] ズームを変えても点線のピクセルサイズが一定に見える
