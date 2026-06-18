/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * versionModal.ts – バージョン情報モーダルの表示・非表示
 *
 * リリースノート本文は public/changelogs/index.json（ビルド時に事前HTML化済み）から
 * changelogClient 経由で取得する。ランタイムでの Markdown パースは行わない。
 */
import { APP_VERSION } from './version';
import { getChangelogEntry } from './changelogClient';

function $el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export async function showVersionModal(): Promise<void> {
  $el('modalVersion').classList.add('open');
  const ver = APP_VERSION;
  if (!ver) {
    $el('mdContent').innerHTML = '<p>バージョン情報が見つかりません。</p>';
    return;
  }
  $el('modalVersionTitle').textContent = `PenAno v${ver.version}`;
  $el('mdContent').innerHTML = '<p style="color:var(--text2);">読み込み中...</p>';
  $el('mdOlderLink').style.display = 'none';

  try {
    const entry = await getChangelogEntry(ver.changelogVersion);
    if (!entry) throw new Error('changelog entry not found: ' + ver.changelogVersion);
    $el('mdContent').innerHTML = entry.html;
    $el('mdContent').querySelectorAll<HTMLAnchorElement>('a').forEach(a => {
      a.target = '_blank';
      a.rel = 'noopener';
    });
  } catch {
    const isOffline = !navigator.onLine;
    $el('mdContent').innerHTML = `<h1>PenAno v${ver.version}</h1><p style="color:var(--text2);">${
      isOffline
        ? 'オフラインのため、リリースノートを取得できませんでした。'
        : 'リリースノートを読み込めませんでした。'
    }</p>`;
  }

  if (ver.githubRepo) {
    $el('mdOlderLink').style.display = 'block';
    $el<HTMLAnchorElement>('mdOlderLinkAnchor').href = ver.githubRepo + '/blob/main/CHANGELOG.md';
  }
}

export function closeVersionModal(): void {
  $el('modalVersion').classList.remove('open');
}
