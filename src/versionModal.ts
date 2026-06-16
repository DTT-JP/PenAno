/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * versionModal.ts – バージョン情報モーダルの表示・非表示
 */
import { marked } from 'marked';
import { APP_VERSION } from './version';

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

  const docUrl = new URL(ver.docFile, document.baseURI).href + '?t=' + Date.now();
  try {
    const res = await fetch(docUrl);
    if (!res.ok) throw new Error('fetch failed: ' + res.status);
    const md = await res.text();
    $el('mdContent').innerHTML = marked.parse(md) as string;
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