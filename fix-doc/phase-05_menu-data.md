<!-- Copyright (c) 2026 DTT-JP. Released under the MIT license. -->
# Phase 05 — メニュー「データ」セクション実装

**対象ファイル:** `index.html`（menuSec-data 内）, `app.js`, `data.js`, `style.css`  
**難易度:** ★★★★  
**前提フェーズ:** Phase 04（メニューモーダル骨格）

---

## 概要

メニューの「データ」セクションに以下を実装する：

1. **保存**（ZIP / 画像付きZIP / 統計データ）
2. **AI学習形式で書き出し**（YOLO / COCO）

---

## セクション HTML（`#menuSec-data` 内に配置）

```html
<section class="menu-section" id="menuSec-data">
  <h2 class="menu-sec-title">データ</h2>

  <!-- ── 保存 ── -->
  <div class="menu-group">
    <div class="menu-group-label">保存</div>
    <button class="menu-action-btn" id="btnSaveZip">
      ZIPでダウンロード
    </button>
    <button class="menu-action-btn" id="btnSaveZipWithImages">
      画像を含めてZIPでダウンロード
    </button>
    <button class="menu-action-btn" id="btnSaveStats">
      統計データをダウンロード
    </button>
  </div>

  <!-- ── AI書き出し ── -->
  <div class="menu-group">
    <div class="menu-group-label">AI学習形式で書き出し</div>

    <!-- 書き出し形式 -->
    <div class="menu-field">
      <label class="menu-field-label">書き出し形式</label>
      <select class="menu-select" id="exportFormat">
        <option value="yolo">YOLO</option>
        <option value="coco">COCO</option>
      </select>
    </div>

    <!-- Train/Val/Test スライダー -->
    <div class="menu-field">
      <label class="menu-field-label">データ分割 (Train / Val / Test)</label>
      <div class="split-sliders" id="splitSliders">
        <div class="split-row">
          <span class="split-label">Train</span>
          <input type="range" min="0" max="100" value="70" class="split-slider" id="splitTrain">
          <span class="split-val" id="splitTrainVal">70%</span>
        </div>
        <div class="split-row">
          <span class="split-label">Val</span>
          <input type="range" min="0" max="100" value="20" class="split-slider" id="splitVal">
          <span class="split-val" id="splitValVal">20%</span>
        </div>
        <div class="split-row">
          <span class="split-label">Test</span>
          <input type="range" min="0" max="100" value="10" class="split-slider" id="splitTest">
          <span class="split-val" id="splitTestVal">10%</span>
        </div>
        <div class="split-total-hint" id="splitTotalHint">合計: 100%</div>
      </div>
    </div>

    <!-- 割り当て方法 -->
    <div class="menu-field">
      <label class="menu-field-label">画像の割り当て方法</label>
      <select class="menu-select" id="splitMethod">
        <option value="random">無作為</option>
        <option value="balanced">ラベル済み数から均等化</option>
      </select>
    </div>

    <!-- クラスID管理 -->
    <div class="menu-field">
      <label class="menu-field-label">クラスIDの管理</label>
      <button class="menu-action-btn" id="btnClassIdManager">
        クラスID割り当てを確認・編集
      </button>
    </div>

    <!-- YOLO専用オプション（exportFormat=yolo の時のみ表示） -->
    <div id="yoloOptions" class="menu-group-sub">
      <div class="menu-field menu-toggle-field">
        <label class="menu-field-label">dataset.yaml を生成</label>
        <label class="toggle-switch">
          <input type="checkbox" id="toggleYaml" checked>
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="menu-field" id="yamlRootField">
        <label class="menu-field-label">dataset.yaml のルートパス</label>
        <input type="text" class="menu-text-input" id="yamlRootPath"
               placeholder="空白なら相対パス（./）">
      </div>
    </div>

    <!-- 書き出しボタン -->
    <button class="menu-action-btn primary" id="btnExportAI">
      書き出しを実行
    </button>
  </div>
</section>
```

---

## JavaScript 実装

### 保存系（`app.js`）

#### ZIPでダウンロード（既存 `onDownloadZip()` を移行）

```js
$('btnSaveZip').addEventListener('click', onDownloadZip);
```

#### 画像を含めてZIPでダウンロード

```js
async function onDownloadZipWithImages() {
  const zip = new JSZip();
  for (const file of DataManager.files) {
    // JSON
    if (file.json) {
      zip.file(file.name.replace(/\.[^.]+$/, '') + '.json',
               JSON.stringify(file.json, null, 2));
    }
    // 画像: Blob URLからfetchして取得
    try {
      const resp = await fetch(file.imageURL);
      const blob = await resp.blob();
      zip.file(file.name, blob);
    } catch (e) {
      console.warn('画像取得失敗:', file.name, e);
    }
  }
  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(content, 'annotations_with_images.zip');
}
$('btnSaveZipWithImages').addEventListener('click', onDownloadZipWithImages);
```

#### 統計データをダウンロード（CSV）

```js
function onDownloadStats() {
  const rows = [['ファイル名', '確認済', 'ラベル数']];
  const confirmed = Storage.getConfirmed();
  for (const f of DataManager.files) {
    const shapes = DataManager.getShapes(f);
    rows.push([f.name, confirmed.has(f.name) ? '○' : '', shapes.length]);
  }
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, 'stats.csv');
}
$('btnSaveStats').addEventListener('click', onDownloadStats);
```

#### ヘルパー

```js
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

### AI書き出し系

#### Train/Val/Test スライダー連動（合計100%を維持）

```js
function initSplitSliders() {
  const sliders = ['splitTrain', 'splitVal', 'splitTest'];
  const vals    = ['splitTrainVal', 'splitValVal', 'splitTestVal'];
  const hint    = $('splitTotalHint');

  sliders.forEach((id, idx) => {
    $(id).addEventListener('input', () => {
      const total = sliders.reduce((s, sid) => s + parseInt($(sid).value, 10), 0);
      hint.textContent = `合計: ${total}%`;
      hint.style.color = total === 100 ? 'var(--success)' : 'var(--warn)';
      vals[idx].textContent = $(id).value + '%';
    });
  });
}
```

#### YOLO専用オプションの表示切替

```js
$('exportFormat').addEventListener('change', e => {
  $('yoloOptions').style.display = e.target.value === 'yolo' ? '' : 'none';
});
```

#### クラスID管理モーダル（簡易版）

Phase 04 の `#modalMenu` とは別に `#modalClassId` を追加。  
ドラッグ並び替えは Phase 05 の範囲外としてよい（初期実装は順序固定でID確認のみ）：

```js
function openClassIdManager() {
  const labels = Object.keys(Storage.getLabelColors()).sort();
  // labels[i] → classId i のテーブルを表示するモーダルを開く
  // 将来: ドラッグ並び替えで順序変更
}
$('btnClassIdManager').addEventListener('click', openClassIdManager);
```

#### YOLO書き出し（`data.js` に追加）

```js
function exportYolo(files, splitRatio, method, genYaml, rootPath) {
  // 1. ラベル一覧をソートしてクラスIDを決定
  // 2. splitRatio に基づいて images を train/val/test に分類
  // 3. 各画像について .txt ファイルを生成（YOLO形式: cls cx cy w h 正規化）
  // 4. genYaml が true なら dataset.yaml も生成
  // 5. JSZip でまとめてダウンロード
}
```

**YOLO フォーマット変換式（LabelMe rectangle → YOLO）:**
```
LabelMe: points = [[x1,y1],[x2,y2]]
cx = (x1 + x2) / 2 / imgW
cy = (y1 + y2) / 2 / imgH
w  = abs(x2 - x1) / imgW
h  = abs(y2 - y1) / imgH
```

#### COCO書き出し（`data.js` に追加）

```js
function exportCoco(files, splitRatio, method) {
  // COCO JSON 形式
  // { "images": [...], "annotations": [...], "categories": [...] }
  // train/val/test それぞれに個別の JSON を生成
}
```

---

## CSS

```css
/* メニュー共通グループ */
.menu-group {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 16px;
}
.menu-group-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 10px;
}
.menu-group-sub {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

/* フィールド */
.menu-field {
  margin-bottom: 12px;
}
.menu-field-label {
  display: block;
  font-size: 12px;
  color: var(--text2);
  margin-bottom: 5px;
}
.menu-select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 13px;
  padding: 7px 8px;
  font-family: var(--font);
}
.menu-text-input {
  /* text-input と同様 */
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 13px;
  padding: 7px 8px;
}
.menu-action-btn {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
  margin-bottom: 6px;
  text-align: left;
  transition: background .15s;
}
.menu-action-btn:active { background: var(--surface); }
.menu-action-btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* スプリットスライダー */
.split-sliders { display: flex; flex-direction: column; gap: 6px; }
.split-row { display: flex; align-items: center; gap: 8px; }
.split-label { width: 36px; font-size: 11px; color: var(--text2); flex-shrink: 0; }
.split-slider { flex: 1; accent-color: var(--accent); }
.split-val { width: 34px; font-size: 11px; color: var(--text); text-align: right; }
.split-total-hint {
  font-size: 11px;
  color: var(--success);
  text-align: right;
  margin-top: 2px;
}

/* トグルスイッチ（Phase 07以降でも使い回し） */
.menu-toggle-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-track {
  position: absolute; inset: 0;
  background: var(--border);
  border-radius: 11px;
  transition: background .2s;
  cursor: pointer;
}
.toggle-track::before {
  content: '';
  position: absolute;
  left: 3px; top: 3px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
}
.toggle-switch input:checked + .toggle-track { background: var(--accent); }
.toggle-switch input:checked + .toggle-track::before { transform: translateX(18px); }
```

---

## テスト確認項目

- [ ] 「ZIPでダウンロード」が正常に動作する（既存機能の移植）
- [ ] 「画像を含めてZIP」が全ファイルを含むZIPを生成する
- [ ] 「統計データ」が CSV としてダウンロードされる
- [ ] Train/Val/Test スライダーの合計が常時表示され、100% 以外のとき警告色になる
- [ ] YOLO 選択時のみ dataset.yaml オプションが表示される
- [ ] COCO 選択時は YOLO オプションが非表示になる
- [ ] 「書き出しを実行」で ZIP ダウンロードが始まる
