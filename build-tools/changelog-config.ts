/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * build-tools/changelog-config.ts
 *
 * Changelog（リリースノート）の Markdown → HTML 変換に関する設定を集約するファイル。
 *
 * 「保存プロセスの変更」（多言語対応の追加、保持するバージョン数の変更など）は
 * このファイルの値を編集するだけで反映されることを目指す。
 * 実際の変換ロジックは build-changelogs.ts 側にあり、このファイルには持ち込まない。
 */

export interface ChangelogConfig {
  /**
   * Markdown ソースのルートディレクトリ（プロジェクトルートからの相対パス）。
   * 構造: `${sourceDir}/${lang}/${version}.md`
   */
  sourceDir: string;

  /**
   * 生成物（個別HTML + index.json）の出力先ディレクトリ。
   * vite の public 配下に置くことで、ビルド後そのまま静的配信される。
   */
  outputDir: string;

  /**
   * 対応言語コードの一覧。
   * 今は日本語のみだが、将来 'en' などを追加する際はここに追記するだけでよい。
   * 一覧の先頭が「デフォルト言語（フォールバック先）」として扱われる。
   */
  languages: string[];

  /**
   * 出力するバージョン数の上限。
   * null/undefined の場合は無制限（ソースにある全バージョンを変換・出力する）。
   * ストレージ容量等の事情で絞りたい場合はここに数値を指定する。
   * 新しい順（バージョン文字列の降順ソートではなく、ファイル内のメタ情報の日付降順）に
   * この件数だけを残し、それより古いものはビルド出力から除外される。
   */
  maxVersions: number | null;

  /**
   * 個別HTMLファイルの命名規則を組み立てる関数。
   * 例: v0-0-0 / ja → "v0-0-0.ja.html"
   */
  buildHtmlFileName: (version: string, lang: string) => string;

  /**
   * index.json のファイル名（outputDir 直下に生成される）。
   */
  indexFileName: string;
}

export const changelogConfig: ChangelogConfig = {
  sourceDir: 'changelogs',
  outputDir: 'public/changelogs',
  languages: ['ja'],
  maxVersions: null,
  buildHtmlFileName: (version, lang) => `${version}.${lang}.html`,
  indexFileName: 'index.json',
};

export default changelogConfig;
