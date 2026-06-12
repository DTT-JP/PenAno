/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/progress.js - 進捗表示 */

export function updateProgressStats() {
    const total = DataManager.count();
    const sid = DataManager.getSessionId();
    const confirmed = sid ? Storage.getConfirmed(sid) : new Set();
    let doneCount = 0;
    for (const file of DataManager.files) {
      if (confirmed.has(file.name)) doneCount++;
    }
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statDone').textContent = doneCount;
    document.getElementById('statLeft').textContent = total - doneCount;
  }