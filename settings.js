/**
 * settings.js – 設定パネルのナビゲーション・トグル管理
 * app.js の bindEvents() から initSettings() を呼び出すこと
 */
function initSettings() {
  const nav = document.getElementById('settingsNav');
  const detail = document.getElementById('settingsDetail');
  if (!nav || !detail) return;

  // ── Nav item switching ──────────────────────────────────
  nav.querySelectorAll('.settings-nav-item[data-pane]').forEach(btn => {
    btn.addEventListener('click', () => {
      const paneId = btn.dataset.pane;

      // Update nav active state
      nav.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show target pane
      detail.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
      const target = document.getElementById(paneId);
      if (target) target.classList.add('active');
    });
  });

  // ── Segmented controls ──────────────────────────────────
  detail.querySelectorAll('.settings-segment').forEach(seg => {
    seg.querySelectorAll('.segment-option').forEach(opt => {
      opt.addEventListener('click', () => {
        seg.querySelectorAll('.segment-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  });

  // ── Version info population ─────────────────────────────
  if (typeof APP_VERSION !== 'undefined') {
    const vEl = document.getElementById('settingsVersionVal');
    const dEl = document.getElementById('settingsDateVal');
    if (vEl) vEl.textContent = APP_VERSION.version;
    if (dEl) dEl.textContent = APP_VERSION.date;
  }

  // ── Clear session button ────────────────────────────────
  const btnClear = document.getElementById('btnClearSession');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (!confirm('localStorageに保存されたすべてのアノテーションデータ・確認フラグ・ラベルカラーを削除しますか？\nこの操作は取り消せません。')) return;
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('lme_')) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
        alert('削除しました。ページを再読み込みします。');
        location.reload();
      } catch (e) {
        alert('削除に失敗しました。');
      }
    });
  }
}