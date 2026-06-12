/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/loadScreen.js - ロード画面処理 */

export async function onFolderSelected(e, callbacks) {
    const els = callbacks.els;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    callbacks.closeVersionModal();
    showProgress(els);
    try {
      await DataManager.loadFromFileList(files, (d, t) => updateProgress(els, d, t));
      onDataLoaded(els, callbacks);
    } catch (err) {
      console.error(err);
      alert('ファイルの読み込みに失敗しました。');
      hideProgress(els);
    }
    e.target.value = '';
  }

export async function onZipSelected(e, callbacks) {
    const els = callbacks.els;
    const file = e.target.files[0];
    if (!file) return;
    callbacks.closeVersionModal();
    showProgress(els);
    try {
      await DataManager.loadFromZip(file, (d, t) => updateProgress(els, d, t));
      onDataLoaded(els, callbacks);
    } catch (err) {
      console.error(err);
      alert('ZIPファイルの読み込みに失敗しました。');
      hideProgress(els);
    }
    e.target.value = '';
  }

export function showProgress(els) {
    els.loadProgress.classList.remove('hidden');
    els.progressFill.style.width = '0%';
    els.progressText.textContent = '読み込み中...';
  }

export function updateProgress(els, done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    els.progressFill.style.width = pct + '%';
    els.progressText.textContent = `読み込み中... ${done} / ${total}`;
  }

export function hideProgress(els) { els.loadProgress.classList.add('hidden'); }

export function onDataLoaded(els, callbacks) {
    if (DataManager.count() === 0) {
      alert('画像ファイルが見つかりませんでした。');
      hideProgress(els);
      return;
    }
    callbacks.initLabels();
    els.loadScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    callbacks.setMode('select');
    callbacks.showCurrentImage();
  }

export function showLoadScreen(els) {
    els.app.classList.add('hidden');
    els.loadScreen.classList.remove('hidden');
    els.loadProgress.classList.add('hidden');
    els.fileInputFolder.value = '';
    els.fileInputZip.value = '';
  }