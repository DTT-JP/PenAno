/**
 * src/types/changelog.ts
 * リリースノート（Changelog）データの型定義。
 *
 * build-tools/build-changelogs.ts が生成する public/changelogs/index.json は
 * この ChangelogIndex 型の構造に従う。
 *
 * 「現在のバージョン情報モーダル」専用ではなく、将来追加されるかもしれない
 * 別の表示先（例: 設定画面内の別パネル、ロード画面・トップページでの最新情報表示など）
 * からも同じデータをそのまま利用できることを意図した、汎用的な構造にしている。
 */

/** 対応言語コード（'ja' | 'en' など）。文字列型にしておき、将来の追加に対応する。 */
export type ChangelogLang = string;

/**
 * 1 バージョン × 1 言語分のレンダリング済みエントリ。
 * 個別 HTML ファイル（public/changelogs/<version>.<lang>.html）の内容は
 * このエントリの html フィールドと同一になる。
 */
export interface ChangelogEntry {
  /** バージョン文字列（例: "v0-0-0"）。ファイル名から拡張子を除いたもの。 */
  version: string;

  /** この内容の言語コード。 */
  lang: ChangelogLang;

  /**
   * Markdown をパースして得られた HTML 本文（<h1> 等を含む完全な断片）。
   * 表示側は基本的にこれをそのまま innerHTML として差し込めばよい。
   */
  html: string;

  /**
   * 個別 HTML ファイルへの相対パス（public 配下からの絶対パス、例: "/changelogs/v0-0-0.ja.html"）。
   * html フィールドを直接使わず fetch して表示したい場合に使用する。
   */
  htmlPath: string;

  /** ソース Markdown の最終更新日時（Unix ミリ秒）。新しい順の並び替えに使用。 */
  updatedAt: number;

  /**
   * Markdown 内の最初の見出し（# ...）から抽出したタイトル。
   * 表示側でリスト一覧などを作る際の見出しに使える。
   */
  title: string;
}

/**
 * public/changelogs/index.json のルート構造。
 * 表示先に依存しないよう、バージョン一覧と言語一覧を分けて持つ。
 */
export interface ChangelogIndex {
  /** このインデックスを生成したビルドの日時（Unix ミリ秒）。 */
  generatedAt: number;

  /** 利用可能な言語コードの一覧（config.languages と対応）。 */
  languages: ChangelogLang[];

  /** デフォルト言語（languages の先頭）。 */
  defaultLang: ChangelogLang;

  /**
   * 出力された全エントリ。新しい順（updatedAt 降順）に並んでいる。
   * 同じ version でも lang ごとに別エントリとして格納される。
   */
  entries: ChangelogEntry[];

  /**
   * maxVersions の設定によって、ソースには存在するが出力から除外された
   * バージョンが何件あるか。0 なら全件出力されている。
   * 表示側で「もっと見る（GitHub等で）」リンクを出す判断に使える。
   */
  truncatedCount: number;
}
