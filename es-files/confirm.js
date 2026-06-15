/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/confirm.js - 確認ボタン処理 */
import DataManager from '../data.js';
import Storage from '../storage.js';
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
  const btnConfirm = document.getElementById('btnConfirm');
  const confirmLabel = document.getElementById('confirmLabel');
  const confirmed = sid ? Storage.isConfirmed(sid, filename) : false;
  if (confirmed) {
    btnConfirm.classList.add('confirmed');
    confirmLabel.textContent = '確認済';
  } else {
    btnConfirm.classList.remove('confirmed');
    confirmLabel.textContent = '確認';
  }
}
