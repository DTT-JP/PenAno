/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/progress.js - 進捗表示 */

function updateProgressStats() {
    const total = DataManager.count();
    const sid = DataManager.getSessionId();
    const confirmed = sid ? Storage.getConfirmed(sid) : new Set();
    let doneCount = 0;
    for (const file of DataManager.files) {
      if (confirmed.has(file.name)) doneCount++;
    }
    els.statTotal.textContent = total;
    els.statDone.textContent = doneCount;
    els.statLeft.textContent = total - doneCount;
  }
