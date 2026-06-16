/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/confirm.ts - 確認ボタン処理 */
import DataManager from '../data';
import Storage from '../storage';
import { updateProgressStats } from './progress';

export function toggleConfirm(): void {
  const file = DataManager.current();
  if (!file) return;
  const sid = DataManager.getSessionId();
  if (!sid) return;
  Storage.setConfirmed(sid, file.name, !Storage.isConfirmed(sid, file.name));
  updateConfirmButton(file.name, sid);
  updateProgressStats();
}

export function updateConfirmButton(filename: string, sid: string | null): void {
  const btnConfirm = document.getElementById('btnConfirm') as HTMLElement;
  const confirmLabel = document.getElementById('confirmLabel') as HTMLElement;
  const confirmed = sid ? Storage.isConfirmed(sid, filename) : false;
  if (confirmed) {
    btnConfirm.classList.add('confirmed');
    confirmLabel.textContent = '確認済';
  } else {
    btnConfirm.classList.remove('confirmed');
    confirmLabel.textContent = '確認';
  }
}