/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * settings.ts – 設定パネルのナビゲーション・トグル管理
 */
import Storage from './storage';
import type { AppCallbacks } from './types/app';

type ToastElement = HTMLDivElement & { _hideTimer?: ReturnType<typeof setTimeout> };

export function initSettings(callbacks: AppCallbacks): void {
  const cb = callbacks;
  const nav = document.getElementById('settingsNav');
  const detail = document.getElementById('settingsDetail');
  if (!nav || !detail) return;

  nav.querySelectorAll<HTMLElement>('.settings-nav-item[data-pane]').forEach(btn => {
    btn.addEventListener('click', () => {
      const paneId = btn.dataset.pane;
      if (!paneId) return;
      nav.querySelectorAll<HTMLElement>('.settings-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      detail.querySelectorAll<HTMLElement>('.settings-pane').forEach(p => p.classList.remove('active'));
      const target = document.getElementById(paneId);
      if (target) target.classList.add('active');

      if (paneId === 'pane-sessions') renderSessionList(cb);
    });
  });

  detail.querySelectorAll<HTMLElement>('.settings-segment').forEach(seg => {
    seg.querySelectorAll<HTMLElement>('.segment-option').forEach(opt => {
      opt.addEventListener('click', () => {
        seg.querySelectorAll<HTMLElement>('.segment-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  });

  const btnClear = document.getElementById('btnClearSession');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (!confirm('localStorageに保存されたすべてのアノテーションデータ・確認フラグ・ラベルカラーを削除しますか？\nこの操作は取り消せません。')) return;
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('lme_')) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
        alert('削除しました。ページを再読み込みします。');
        location.reload();
      } catch(e) { alert('削除に失敗しました。'); }
    });
  }
}

function renderSessionList(cb: AppCallbacks): void {
  const container = document.getElementById('sessionListContainer');
  if (!container) return;

  const sessions = Storage.getSessions();
  const currentId = cb.getCurrentSessionId ? cb.getCurrentSessionId() : null;

  if (sessions.length === 0) {
    container.innerHTML = '<p class="settings-desc" style="padding:8px 0;">保存されたセッションはありません。</p>';
    return;
  }

  container.innerHTML = '';

  for (const sess of sessions) {
    const isCurrent = sess.id === currentId;
    const card = document.createElement('div');
    card.className = 'session-card' + (isCurrent ? ' session-card--current' : '');

    const header = document.createElement('div');
    header.className = 'session-card-header';

    const typeIcon = document.createElement('span');
    typeIcon.className = 'session-type-icon';
    typeIcon.textContent = sess.type === 'zip' ? '🗜' : '📁';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'session-name';
    nameSpan.textContent = sess.displayName;

    const badge = document.createElement('span');
    badge.className = 'session-badge';
    if (isCurrent) {
      badge.textContent = '現在';
      badge.style.color = 'var(--accent-h)';
      badge.style.borderColor = 'var(--accent)';
    }

    header.appendChild(typeIcon);
    header.appendChild(nameSpan);
    if (isCurrent) header.appendChild(badge);

    const dateEl = document.createElement('div');
    dateEl.className = 'session-date';
    dateEl.textContent = new Date(sess.createdAt).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' });

    const actions = document.createElement('div');
    actions.className = 'session-actions';

    if (!isCurrent) {
      const copyToCurrentBtn = document.createElement('button');
      copyToCurrentBtn.className = 'session-action-btn';
      copyToCurrentBtn.title = 'このセッションのラベルカラーを現在のセッションにコピー';
      copyToCurrentBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <polyline points="9,11 12,14 22,4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        ラベルを現在にコピー`;
      copyToCurrentBtn.addEventListener('click', () => {
        if (!currentId) { alert('現在開いているセッションがありません。'); return; }
        const colorsFrom = Storage.getLabelColors(sess.id);
        if (Object.keys(colorsFrom).length === 0) { alert('このセッションにラベルカラーがありません。'); return; }
        Storage.mergeLabelColors(currentId, colorsFrom);
        if (cb.reloadLabelColors) cb.reloadLabelColors();
        showToast(`「${sess.displayName}」のラベルをコピーしました`);
      });
      actions.appendChild(copyToCurrentBtn);
    }

    if (currentId && !isCurrent) {
      const copyFromCurrentBtn = document.createElement('button');
      copyFromCurrentBtn.className = 'session-action-btn';
      copyFromCurrentBtn.title = '現在のセッションのラベルカラーをこのセッションにコピー';
      copyFromCurrentBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15,3 21,3 21,9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        現在のラベルをここにコピー`;
      copyFromCurrentBtn.addEventListener('click', () => {
        const colorsFrom = cb.getLabelColors ? cb.getLabelColors() : {};
        if (Object.keys(colorsFrom).length === 0) { alert('現在のセッションにラベルカラーがありません。'); return; }
        Storage.mergeLabelColors(sess.id, colorsFrom);
        showToast(`現在のラベルを「${sess.displayName}」にコピーしました`);
      });
      actions.appendChild(copyFromCurrentBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'session-action-btn session-action-btn--danger';
    delBtn.title = 'このセッションの保存データを削除';
    delBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <polyline points="3,6 5,6 21,6"/>
        <path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6M14 11v6"/>
      </svg>
      保存データを削除`;
    delBtn.addEventListener('click', () => {
      if (!confirm(`「${sess.displayName}」の保存データ（アノテーション・確認フラグ・ラベルカラー）を削除しますか？\nこの操作は取り消せません。`)) return;
      Storage.deleteSession(sess.id);
      showToast(`「${sess.displayName}」のデータを削除しました`);
      renderSessionList(cb);
    });
    actions.appendChild(delBtn);

    card.appendChild(header);
    card.appendChild(dateEl);
    if (actions.children.length > 0) card.appendChild(actions);
    container.appendChild(card);
  }
}

export function showToast(msg: string): void {
  let toast = document.getElementById('appToast') as ToastElement | null;
  if (!toast) {
    toast = document.createElement('div') as ToastElement;
    toast.id = 'appToast';
    toast.style.cssText = `
      position:fixed; bottom:30px; left:50%; transform:translateX(-50%) translateY(20px);
      background:var(--surface2); border:1px solid var(--border2);
      color:var(--text); font-size:13px; font-weight:600;
      padding:10px 20px; border-radius:999px;
      box-shadow:0 4px 20px rgba(0,0,0,.5);
      z-index:9999; opacity:0;
      transition:opacity .2s, transform .2s;
      pointer-events:none; white-space:nowrap;
      font-family:-apple-system,'Helvetica Neue',sans-serif;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.transition = 'none';
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(-50%) translateY(20px)';
  requestAnimationFrame(() => {
    const t = toast as ToastElement;
    t.style.transition = 'opacity .2s, transform .2s';
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2200);
  });
}