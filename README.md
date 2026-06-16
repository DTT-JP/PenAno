# PenAno

> **English version:** [README.en.md](./lang/README.en.md)

タブレット端末向け Web アノテーションツール。ブラウザ上で画像を開き、LabelMe 形式の矩形アノテーションを作成・編集・エクスポートできます。インストール不要で動作し、PWA としてインストールも可能です。

---

## 機能

- フォルダまたは ZIP ファイルから画像を一括読み込み
- 矩形アノテーションの描画・移動・リサイズ・削除
- LabelMe JSON 形式での保存・エクスポート
- ラベルカラーのカスタマイズ
- セッション管理（LocalStorage に自動保存）
- ピンチズーム・パン操作（タブレット / Apple Pencil 対応）
- PWA 対応（オフライン動作・ホーム画面へのインストール）

---

## 動作環境

| 環境 | 備考 |
|------|------|
| Chrome / Edge（最新版） | 推奨 |
| Safari（iOS 16 以上） | タブレット・iPhone |
| Firefox（最新版） | 動作確認済み |

インターネット接続不要（初回読み込み後はオフラインで動作）

---

## 公開版

**https://penano.dttjp.com**

上記 URL をブラウザで開くだけで、インストール不要ですぐに使えます。

---

## 使い方

### 1. アプリを開く

公開版（https://penano.dttjp.com）またはセルフホスト版の URL をブラウザで開きます。

### 2. 画像を読み込む

起動後のロード画面で以下のいずれかを選択します。

- **フォルダを選択** — 画像が入ったフォルダをまとめて選択
- **ZIP を選択** — 画像をまとめた ZIP ファイルを選択

対応画像形式: `jpg` / `jpeg` / `png` / `bmp` / `webp` / `gif`

フォルダ内に同名の `.json` ファイルがある場合、既存アノテーションとして読み込みます。

### 3. アノテーションを作成する

| 操作 | 方法 |
|------|------|
| モード切替 | 画面上部の「選択」「追加」ボタン |
| 矩形を描く | 追加モードでドラッグ（マウス / Apple Pencil） |
| 矩形を選択 | 選択モードでタップ |
| 移動 | 選択後にドラッグ |
| リサイズ | 選択後、ハンドルをドラッグ |
| 削除 | オブジェクトリストの「×」ボタン |
| ズーム | ピンチ操作またはズームパネル |

### 4. ラベルを管理する

- 左パネルのラベルリストからラベルを選択してアノテーションに割り当て
- 「＋」ボタンで新しいラベルを追加
- カラースウォッチをタップして色を変更
- 「×」ボタンでラベルと紐づくアノテーションを一括削除

### 5. エクスポートする

「その他」メニュー →「ZIP をダウンロード」で全アノテーション JSON を ZIP 形式でダウンロードします。

---

## ファイル構成

```
PenAno/
├── index.html                  # エントリーポイント
├── vite.config.ts              # Vite 設定
├── tsconfig.json               # TypeScript 設定
├── package.json
├── src/
│   ├── main.ts                 # メインロジック
│   ├── canvas.ts               # 画像表示・アノテーション描画
│   ├── data.ts                 # ファイル読み込み・JSON管理
│   ├── storage.ts              # LocalStorage 永続化
│   ├── state.ts                # アプリ状態変数
│   ├── settings.ts             # 設定パネル
│   ├── version.ts              # バージョン定義
│   ├── style.css               # スタイル
│   ├── vite-env.d.ts           # Vite / PWA 型定義
│   ├── types/
│   │   ├── app.ts              # アプリ共通型定義
│   │   ├── labelme.ts          # LabelMe JSON 型定義
│   │   └── storage.ts          # Storage 型定義
│   └── ui/
│       ├── confirm.ts          # 確認ボタン
│       ├── labelList.ts        # ラベルリスト UI
│       ├── loadScreen.ts       # ロード画面
│       ├── objectList.ts       # オブジェクトリスト UI
│       ├── progress.ts         # 進捗表示
│       └── zoom.ts             # ズーム操作
├── tasks/
│   └── types/                  # 型定義の原本（src/types/ にコピー済み）
├── tools/
│   ├── setup-phase3.ps1        # TypeScript 移行 事前準備スクリプト
│   └── rename-to-ts.ps1        # .js → .ts リネームスクリプト
├── public/
│   └── CHANGELOG/
└── icons/
```

---

## 開発者向けセットアップ

### 必要なもの

- Node.js 18 以上
- npm 9 以上
- Git

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/DTT-JP/PenAno.git
cd PenAno

# 2. 依存パッケージをインストール
npm install

# 3. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開くと起動します。

### ビルド

```bash
npm run build
```

`dist/` フォルダにビルド成果物が出力されます。

---

## Cloudflare Pages へのデプロイ

GitHub リポジトリと連携して自動デプロイします。

### 1. GitHub にリポジトリを作成してプッシュ

GitHub で新しいリポジトリを作成し、以下のコマンドでプッシュします。

```bash
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git branch -M main
git push -u origin main
```

### 2. Cloudflare Pages にログイン

[https://dash.cloudflare.com](https://dash.cloudflare.com) にアクセスしてログインします。

### 3. プロジェクトを作成する

1. 左メニューから **Workers & Pages** を選択
2. **Create application** → **Pages** タブを選択
3. **Connect to Git** をクリック
4. GitHub アカウントを連携し、対象リポジトリを選択して **Begin setup** をクリック

### 4. ビルド設定を入力する

| 項目 | 値 |
|------|-----|
| Production branch | `main` |
| Framework preset | `None`（手動設定） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | （空欄のまま） |

**Environment variables（環境変数）の設定は不要です。**

### 5. デプロイを実行する

**Save and Deploy** をクリックするとビルドが始まります。完了後、`https://<プロジェクト名>.pages.dev` でアクセスできます。

### 6. 以降の自動デプロイ

`main` ブランチにプッシュするたびに自動でビルド・デプロイされます。

```bash
git add .
git commit -m "更新内容"
git push
```

---

## ライセンス

MIT License — Copyright (c) 2026 DTT-JP

詳細は [LICENSE](./LICENSE) を参照してください。

サードパーティライブラリのライセンスは [THIRD-PARTY-NOTICES.txt](./THIRD-PARTY-NOTICES.txt) を参照してください。