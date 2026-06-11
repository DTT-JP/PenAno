<!-- Copyright (c) 2026 DTT-JP. Released under the MIT license. -->
# Phase 02 — BBox リサイズハンドル強化（面移動禁止）

**対象ファイル:** `canvas.js`  
**難易度:** ★★☆  
**前提フェーズ:** なし（単独実装可）

---

## 概要

追加確定後、BBox の**上下左右・四隅のハンドルでリサイズ微調整を可能**にする。  
ただし、**BBox の面（内側）を掴んでの移動は禁止**する（誤作動防止）。

---

## 現状の実装

### できていること
- `getHandlePositions()` で8点ハンドルを SVG `<circle>` として描画済み
- `hitTestHandle()` でハンドルへのヒット判定実装済み
- `applyResize()` でリサイズ計算実装済み

### できていないこと・問題点

1. **ハンドルが小さすぎて押しにくい**  
   現状 `r = 6 / _zoom` — ズームアウトすると極小になる

2. **面内タップで移動できてしまう**  
   仕様では追加後に面移動を禁止したい（リサイズのみ許可）  
   ※ただし「選択モード」での既存オブジェクト移動は従来通り維持する

3. **ハンドルのタッチ判定がズームに対して不安定**  
   `RADIUS = 10 / _zoom` は意図通りだが、ハンドル描画サイズとずれる場合がある

---

## 仕様整理

| シナリオ | 面タップ | ハンドルドラッグ |
|---------|---------|----------------|
| 選択モード（既存オブジェクト） | 移動OK（現状維持） | リサイズOK（現状維持） |
| 追加直後（`justAdded` フラグ） | **移動禁止** | リサイズOK |

「追加直後」とは、`addShape` コールバックで追加された直後の選択状態を指す。  
別オブジェクトをタップするか、モード切替を行うとフラグがリセットされる。

---

## 実装手順

### 1. `canvas.js` — `_justAdded` フラグの追加

```js
let _justAdded = false; // 直前に追加したオブジェクトを選択中か
```

`setShapes()` と `setSelectedIdx()` を呼び出した後にフラグをリセット：

```js
function setShapes(shapes, labelColors) {
  // ... 既存処理 ...
  _justAdded = false; // ← 追加
  renderAnnotations();
}

function setSelectedIdx(i) {
  _selectedIdx = i;
  _justAdded = false; // ← 追加
  renderAnnotations();
}
```

`addShape` コールバック経由で選択した直後のみ `true` にする。  
`app.js` の `handleShapesChanged` → `'addShape'` 分岐で：

```js
// app.js の handleShapesChanged 内
case 'addShape': {
  // ... 既存の addShape 処理 ...
  CanvasManager.setSelectedIdx(shapes.length - 1);
  CanvasManager.setJustAdded(true); // ← 追加
  break;
}
```

`canvas.js` に `setJustAdded` を公開：

```js
function setJustAdded(v) { _justAdded = v; }
// return に追加: setJustAdded
```

### 2. `canvas.js` — `onPointerDown` の面移動制御

選択モードのヒット判定部分（既存コード）：

```js
// 既存:
const hitIdx = hitTestShape(ix, iy);
if (hitIdx >= 0) {
  _selectedIdx = hitIdx;
  _drag = { type: 'move', ... };
  ...
}
```

`_justAdded` チェックを追加：

```js
const hitIdx = hitTestShape(ix, iy);
if (hitIdx >= 0) {
  _selectedIdx = hitIdx;
  _justAdded = false; // 別オブジェクト選択でフラグリセット

  // justAdded 中は面移動を禁止（ドラッグ開始しない）
  if (_justAdded && hitIdx === _selectedIdx) {
    renderAnnotations();
    if (_onShapesChanged) _onShapesChanged('select', _selectedIdx);
    return; // ドラッグ設定せずに終了
  }

  _drag = { type: 'move', idx: _selectedIdx, startImgX: ix, startImgY: iy,
            origPts: JSON.parse(JSON.stringify(_shapes[_selectedIdx].points)) };
  renderAnnotations();
  if (_onShapesChanged) _onShapesChanged('select', _selectedIdx);
  return;
}
```

> ※ `onTouchStart` の pencil 分岐も同様に修正が必要。

### 3. `canvas.js` — ハンドルサイズの調整

現状の描画半径 `6 / _zoom` を大きめに変更し、視認性と操作性を改善：

```js
// renderAnnotations() 内:
c.setAttribute('r', 8 / _zoom);   // 描画: 6 → 8

// hitTestHandle() 内:
const RADIUS = 14 / _zoom;        // 判定: 10 → 14
```

> Phase 07「表示設定」でハンドルサイズを CSS 変数 `--handle-size` に切り出し、  
> スライダーで 4〜24px の範囲で変更できるよう拡張する。

### 4. `canvas.js` — ハンドルの視覚改善

現状は白塗りの小さな円のみ。より押しやすそうな見た目に変更：

```js
// 選択中ハンドルに影を追加
c.setAttribute('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))');

// ハンドル位置別に cursor hint (data属性で管理)
c.setAttribute('data-cursor', getCursorForHandle(hName));
```

```js
function getCursorForHandle(h) {
  const map = {
    nw: 'nwse-resize', ne: 'nesw-resize',
    sw: 'nesw-resize', se: 'nwse-resize',
    n: 'ns-resize',    s: 'ns-resize',
    w: 'ew-resize',    e: 'ew-resize',
  };
  return map[h] || 'default';
}
```

---

## 注意点

- `onTouchMove` / `onTouchEnd` の stylus 分岐も `_justAdded` フラグを参照する必要がある
- 「面移動禁止」は追加直後のみ。別オブジェクトをタップして選択し直した場合は通常の移動が可能
- Phase 08「動作設定」に「追加したあとに選択に戻す」トグルが追加される際、このフラグ管理と連携する

---

## テスト確認項目

- [ ] 追加直後はハンドルドラッグでリサイズできる
- [ ] 追加直後は面ドラッグで移動しない
- [ ] 既存オブジェクトを選択し直したら面ドラッグで移動できる
- [ ] ハンドルのタップ判定がズームアウト時も十分広い
- [ ] Apple Pencil（stylus）でもハンドル操作が正常に動く
