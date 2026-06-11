<!-- Copyright (c) 2026 DTT-JP. Released under the MIT license. -->
# Phase 04 — 「…」メニューをブラウザ中央モーダル化 + メニュー構造の骨格実装

**対象ファイル:** `index.html`, `app.js`, `style.css`  
**難易度:** ★★☆  
**前提フェーズ:** Phase 03 推奨（サイドバー整理後）

---

## 概要

- 「その他（…）」をサイドバー横に飛び出すフライアウトから、**ブラウザ全体の中央に表示されるモーダル**へ変更
- 名称を「**メニュー**」に変更
- モーダル内は **2 カラム構成**（左: カテゴリ一覧 / 右: 詳細パネル）
- Phase 05〜11 で実装する各セクションのカテゴリを左カラムに配置
- Phase 04 では **骨格のみ実装**。各カテゴリの詳細パネルはスタブ表示でOK

---

## 削除するもの

- `#flyoutOther` フライアウトパネル（index.html から削除）
- `FLYOUTS.other` エントリ（app.js から削除）
- `style.css` のフライアウト `other` 固有スタイル

---

## HTML 構造

```html
<!-- ════ Menu Modal ════ -->
<div id="modalMenu" class="modal-overlay modal-menu-overlay">
  <div class="modal-menu-card">

    <!-- ヘッダー -->
    <div class="modal-menu-header">
      <span class="modal-menu-title">メニュー</span>
      <button class="modal-close" id="btnCloseMenu">×</button>
    </div>

    <div class="modal-menu-body">

      <!-- 左カラム: カテゴリ -->
      <nav class="menu-nav">
        <button class="menu-nav-item active" data-section="data">
          <svg>...</svg> データ
        </button>
        <button class="menu-nav-item" data-section="session">
          <svg>...</svg> セッション
        </button>
        <div class="menu-nav-divider"></div>
        <button class="menu-nav-item" data-section="settings">
          <svg>...</svg> 設定
        </button>
        <button class="menu-nav-item" data-section="display">
          <svg>...</svg> 表示
        </button>
        <button class="menu-nav-item" data-section="behavior">
          <svg>...</svg> 動作と保存
        </button>
        <button class="menu-nav-item" data-section="accessibility">
          <svg>...</svg> ユーザー補助
        </button>
        <button class="menu-nav-item" data-section="pen">
          <svg>...</svg> ペンと入力
        </button>
        <button class="menu-nav-item" data-section="shortcuts">
          <svg>...</svg> ショートカット
        </button>
        <div class="menu-nav-divider"></div>
        <button class="menu-nav-item" data-section="app">
          <svg>...</svg> アプリ
        </button>
      </nav>

      <!-- 右カラム: 詳細パネル -->
      <div class="menu-content">
        <!-- data-section ごとの <section> を埋め込み -->
        <!-- Phase 05〜11 でそれぞれ中身を実装する -->

        <section class="menu-section active" id="menuSec-data">
          <!-- Phase 05 で実装 -->
          <h2 class="menu-sec-title">データ</h2>
          <p class="menu-placeholder">（Phase 05 で実装）</p>
        </section>

        <section class="menu-section" id="menuSec-session">
          <h2 class="menu-sec-title">セッション</h2>
          <p class="menu-placeholder">（Phase 06 で実装）</p>
        </section>

        <section class="menu-section" id="menuSec-settings">
          <h2 class="menu-sec-title">設定</h2>
          <p class="menu-placeholder">（Phase 07 で実装）</p>
        </section>

        <section class="menu-section" id="menuSec-display">
          <h2 class="menu-sec-title">表示</h2>
          <p class="menu-placeholder">（Phase 07 で実装）</p>
        </section>

        <section class="menu-section" id="menuSec-behavior">
          <h2 class="menu-sec-title">動作と保存</h2>
          <p class="menu-placeholder">（Phase 08 で実装）</p>
        </section>

        <section class="menu-section" id="menuSec-accessibility">
          <h2 class="menu-sec-title">ユーザー補助</h2>
          <p class="menu-placeholder">（Phase 09 で実装）</p>
        </section>

        <section class="menu-section" id="menuSec-pen">
          <h2 class="menu-sec-title">ペンと入力</h2>
          <p class="menu-placeholder">（Phase 10 で実装）</p>
        </section>

        <section class="menu-section" id="menuSec-shortcuts">
          <h2 class="menu-sec-title">ショートカット</h2>
          <p style="color:var(--text2);">現在準備中です。</p>
        </section>

        <section class="menu-section" id="menuSec-app">
          <h2 class="menu-sec-title">アプリ</h2>
          <p class="menu-placeholder">（Phase 11 で実装）</p>
        </section>

      </div><!-- /menu-content -->
    </div><!-- /modal-menu-body -->
  </div><!-- /modal-menu-card -->
</div>
```

---

## CSS

```css
/* ── メニューモーダル ─────────────────────── */
.modal-menu-overlay {
  padding: 16px;
  align-items: center;
  justify-content: center;
}

.modal-menu-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 760px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,.7);
  overflow: hidden;
}

.modal-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-menu-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.modal-menu-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左カラム */
.menu-nav {
  width: 160px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font);
  text-align: left;
  transition: background .15s, color .15s;
  width: 100%;
}
.menu-nav-item svg { width: 15px; height: 15px; flex-shrink: 0; }
.menu-nav-item:hover { background: var(--surface); color: var(--text); }
.menu-nav-item.active {
  background: var(--accent);
  color: #fff;
}
.menu-nav-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 6px;
}

/* 右カラム */
.menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  -webkit-overflow-scrolling: touch;
}
.menu-section { display: none; }
.menu-section.active { display: block; }
.menu-sec-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.menu-placeholder {
  color: var(--text3);
  font-size: 13px;
}

/* モバイル対応: 画面幅が狭い場合はカテゴリを上に */
@media (max-width: 480px) {
  .modal-menu-body { flex-direction: column; }
  .menu-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 6px;
  }
  .menu-nav-item { flex-shrink: 0; font-size: 11px; padding: 6px 8px; }
}
```

---

## JavaScript（app.js）

### `btnOtherMenu` → `btnMenuOpen` に改名

サイドバーフッターのボタン `id="btnOtherMenu"` を `id="btnMenuOpen"` に変更し、  
クリックで `openMenuModal()` を呼ぶ：

```js
function openMenuModal(section) {
  document.getElementById('modalMenu').classList.add('open');
  if (section) switchMenuSection(section);
}

function closeMenuModal() {
  document.getElementById('modalMenu').classList.remove('open');
}

function switchMenuSection(name) {
  document.querySelectorAll('.menu-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === name);
  });
  document.querySelectorAll('.menu-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'menuSec-' + name);
  });
}
```

```js
// イベントバインド
$('btnMenuOpen').addEventListener('click', () => openMenuModal('data'));
$('btnCloseMenu').addEventListener('click', closeMenuModal);
document.getElementById('modalMenu').addEventListener('click', e => {
  if (e.target === document.getElementById('modalMenu')) closeMenuModal();
});
document.querySelectorAll('.menu-nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchMenuSection(btn.dataset.section));
});
```

### 既存 `btnDownloadZip` / `btnReload` / `btnVersionInfo` の移行

これらは `#menuSec-data` / `#menuSec-app` 内に移動する。  
Phase 05・11 で移行先を実装する。

---

## テスト確認項目

- [ ] サイドバーの「…」ボタンでブラウザ中央にモーダルが開く
- [ ] モーダルの背景クリックで閉じる
- [ ] × ボタンで閉じる
- [ ] 左カラムのカテゴリをタップで右カラムが切り替わる
- [ ] モバイル幅ではカテゴリが横スクロールに切り替わる
- [ ] 旧フライアウトは表示されない
