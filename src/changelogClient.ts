/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * src/changelogClient.ts
 *
 * public/changelogs/index.json を取得し、任意のバージョン・言語の
 * ChangelogEntry を解決するための共通アクセス層。
 *
 * versionModal.ts（現在のバージョン情報モーダル）専用ではなく、
 * 将来追加されるかもしれない別の表示先（ロード画面の最新情報パネル、
 * 設定画面内の別タブ等）からも同じ関数を呼び出して使うことを想定している。
 */
import type { ChangelogEntry, ChangelogIndex } from './types/changelog';

let _cachedIndex: ChangelogIndex | null = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分。リリースノートは頻繁に変わらないため緩めに設定。

/**
 * index.json を取得する。一定時間内の再呼び出しはキャッシュを返す。
 * @param baseUrl index.json の配置場所（既定: '/changelogs/index.json'）
 */
export async function fetchChangelogIndex(baseUrl = '/changelogs/index.json'): Promise<ChangelogIndex> {
  const now = Date.now();
  if (_cachedIndex && now - _cachedAt < CACHE_TTL_MS) {
    return _cachedIndex;
  }
  const res = await fetch(baseUrl + '?t=' + now);
  if (!res.ok) throw new Error('fetch failed: ' + res.status);
  const index = await res.json() as ChangelogIndex;
  _cachedIndex = index;
  _cachedAt = now;
  return index;
}

/**
 * 指定バージョン・言語に対応するエントリを取得する。
 * 該当言語が無い場合は index.defaultLang にフォールバックする。
 *
 * @param version  changelogVersion（例: "v0-0-0"）
 * @param lang     優先する言語コード（例: "ja"）。省略時は defaultLang を使用。
 */
export async function getChangelogEntry(version: string, lang?: string): Promise<ChangelogEntry | null> {
  const index = await fetchChangelogIndex();
  const preferredLang = lang ?? index.defaultLang;

  const exact = index.entries.find(e => e.version === version && e.lang === preferredLang);
  if (exact) return exact;

  // 指定言語に該当バージョンが無ければ、デフォルト言語にフォールバック
  const fallback = index.entries.find(e => e.version === version && e.lang === index.defaultLang);
  return fallback ?? null;
}

/**
 * 最新（updatedAt が最大）のエントリを取得する。
 * トップページやロード画面で「最新のお知らせ」を出す用途を想定。
 */
export async function getLatestChangelogEntry(lang?: string): Promise<ChangelogEntry | null> {
  const index = await fetchChangelogIndex();
  const preferredLang = lang ?? index.defaultLang;
  const candidates = index.entries.filter(e => e.lang === preferredLang);
  const pool = candidates.length > 0 ? candidates : index.entries.filter(e => e.lang === index.defaultLang);
  if (pool.length === 0) return null;
  // entries は既に新しい順だが、フィルタ後も保証するためソートしておく
  return [...pool].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/**
 * 指定言語の全エントリ一覧を新しい順で取得する。
 * 「過去のリリースノート一覧」のような表示先で使うことを想定。
 */
export async function listChangelogEntries(lang?: string): Promise<ChangelogEntry[]> {
  const index = await fetchChangelogIndex();
  const preferredLang = lang ?? index.defaultLang;
  const pool = index.entries.filter(e => e.lang === preferredLang);
  return [...pool].sort((a, b) => b.updatedAt - a.updatedAt);
}
