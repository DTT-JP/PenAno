<!-- Copyright (c) 2026 DTT-JP. Released under the MIT license. -->
# PenAno 改修ロードマップ

> 仕様書・チャンネルログをもとに、現ソースコードへの差分を**フェーズ単位**で整理したもの。
> 各フェーズは独立した `fix-doc/phase-XX_*.md` に詳細を記述する。

---

## フェーズ一覧

| # | ファイル | 内容 | 難易度 | 主な変更ファイル |
|---|---------|------|--------|----------------|
| 01 | `phase-01_canvas-crosshair.md` | ホバー・カーソル十字線の実装 | ★★☆ | canvas.js, style.css |
| 02 | `phase-02_canvas-resize-only.md` | 選択時ハンドルでのリサイズ強化（面移動禁止モード分離） | ★★☆ | canvas.js |
| 03 | `phase-03_sidebar-swipe-drawers.md` | サイドバーのスワイプ展開ドロワー化（進捗・ズーム） | ★★★ | index.html, app.js, style.css |
| 04 | `phase-04_menu-modal.md` | 「…」メニューをブラウザ中央モーダル化 + メニュー名を「メニュー」に変更 | ★★☆ | index.html, app.js, style.css |
| 05 | `phase-05_menu-data.md` | メニュー「データ」セクション実装（保存・AI書き出し） | ★★★★ | index.html, app.js, data.js, style.css |
| 06 | `phase-06_menu-session.md` | メニュー「セッション」セクション実装 | ★★★ | index.html, app.js, storage.js, style.css |
| 07 | `phase-07_menu-settings-display.md` | メニュー「表示」設定（テーマ・利き手・スライダー群） | ★★★ | index.html, app.js, style.css, storage.js |
| 08 | `phase-08_menu-settings-behavior.md` | メニュー「動作と保存」設定（引き継ぎ・吸着・警告） | ★★★ | app.js, canvas.js, storage.js |
| 09 | `phase-09_menu-accessibility.md` | メニュー「ユーザー補助」設定 | ★★☆ | app.js, style.css, storage.js |
| 10 | `phase-10_menu-pen-input.md` | メニュー「ペンと入力」設定 + 入力診断コンポーネント | ★★★ | canvas.js, app.js, index.html |
| 11 | `phase-11_menu-app-info.md` | メニュー「アプリ」情報セクション（インストール案内等） | ★★☆ | app.js, index.html |

---

## 依存関係と推奨実施順

```
Phase 01 (十字線)  ←  単独実装可
Phase 02 (リサイズ) ←  単独実装可
Phase 03 (ドロワー) ←  Phase 04 より先に着手推奨（UIの骨格）
Phase 04 (モーダル化) ←  Phase 05〜11 のベースになる
Phase 05 (データ)  ← Phase 04 完了後
Phase 06 (セッション) ← Phase 04 + storage.js 拡張後
Phase 07 (表示設定) ← Phase 04 完了後
Phase 08 (動作設定) ← Phase 07 の CSS 変数基盤があると楽
Phase 09 (補助設定) ← Phase 07 と同時進行可
Phase 10 (ペン設定) ← Phase 01/02 完了後
Phase 11 (アプリ情報) ← Phase 04 完了後、他フェーズと独立
```

---

## 現ソースコードの構成メモ

```
PenAno/
├── index.html      # DOM構造・フライアウトパネル定義
├── style.css       # CSS変数ベースのダークテーマ
├── version.js      # APP_VERSION 定数
├── app.js          # メインロジック・イベントバインド・フライアウト制御
├── canvas.js       # 描画・ポインタ/タッチイベント・アノテーション
├── data.js         # ファイル読み込み・JSON管理
├── storage.js      # localStorage ラッパー
└── sw.js           # Service Worker
```

### 現状の主要データフロー
- `DataManager` → `CanvasManager.setShapes()` → SVG描画
- `Storage` → ラベル色・確認フラグ・JSONの永続化
- `CanvasManager.onShapesChanged()` → `app.js` の `handleShapesChanged()` でコールバック

---

## 変更しない方針のもの

- LabelMe JSON フォーマット（shapes の構造）
- `lib/` 以下のサードパーティライブラリ
- Service Worker のキャッシュ対象ファイルリスト（各フェーズ完了後に `sw.js` のキャッシュ名更新を推奨）
