/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/progress.ts - 進捗表示 */
import DataManager from '../data';
import Storage from '../storage';

export function updateProgressStats(): void {
  const total = DataManager.count();
  const sid = DataManager.getSessionId();
  const confirmed = sid ? Storage.getConfirmed(sid) : new Set<string>();
  let doneCount = 0;
  for (const file of DataManager.files) {
    if (confirmed.has(file.name)) doneCount++;
  }
  (document.getElementById('statTotal') as HTMLElement).textContent = String(total);
  (document.getElementById('statDone') as HTMLElement).textContent = String(doneCount);
  (document.getElementById('statLeft') as HTMLElement).textContent = String(total - doneCount);
}