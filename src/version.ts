/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * version.ts – アプリバージョン定義
 */
export const APP_VERSION: {
  version: string;
  date: string;
  /**
   * public/changelogs/index.json 内の ChangelogEntry.version と対応するキー。
   * 個別HTMLファイル名は `${changelogVersion}.${lang}.html` になる。
   */
  changelogVersion: string;
  githubRepo: string;
} = {
  version: '0.0.0-dev-p4-v4',
  date: '2026-06-18',
  changelogVersion: 'v0-0-0',
  githubRepo: 'https://github.com/DTT-JP/PenAno',
};
