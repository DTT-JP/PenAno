/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/confirm.js - 確認ボタン処理 */

import { updateProgressStats } from './progress.js';

export function toggleConfirm() {
    const file = DataManager.current();
    if (!file) return;
    const sid = DataManager.getSessionId();
    if (!sid) return;
    Storage.setConfirmed(sid, file.name, !Storage.isConfirmed(sid, file.name));
    updateConfirmButton(file.name, sid);
    updateProgressStats();
  }

export function updateConfirmButton(filename, sid) {
    const els = {
      btnConfirm: document.getElementById('btnConfirm'),
      confirmLabel: document.getElementById('confirmLabel'),
    };
    const confirmed = sid ? Storage.isConfirmed(sid, filename) : false;
    if (confirmed) {
      els.btnConfirm.classList.add('confirmed');
      els.confirmLabel.textContent = '確認済';
    } else {
      els.btnConfirm.classList.remove('confirmed');
      els.confirmLabel.textContent = '確認';
    }
  }