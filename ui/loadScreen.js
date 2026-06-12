/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/loadScreen.js - ロード画面処理 */

async function onFolderSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    closeVersionModal();
    showProgress();
    try {
      await DataManager.loadFromFileList(files, updateProgress);
      onDataLoaded();
    } catch (err) {
      console.error(err);
      alert('ファイルの読み込みに失敗しました。');
      hideProgress();
    }
    e.target.value = '';
  }

async function onZipSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    closeVersionModal();
    showProgress();
    try {
      await DataManager.loadFromZip(file, updateProgress);
      onDataLoaded();
    } catch (err) {
      console.error(err);
      alert('ZIPファイルの読み込みに失敗しました。');
      hideProgress();
    }
    e.target.value = '';
  }

function showProgress() {
    els.loadProgress.classList.remove('hidden');
    els.progressFill.style.width = '0%';
    els.progressText.textContent = '読み込み中...';
  }

function updateProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    els.progressFill.style.width = pct + '%';
    els.progressText.textContent = `読み込み中... ${done} / ${total}`;
  }

function hideProgress() { els.loadProgress.classList.add('hidden'); }

function onDataLoaded() {
    if (DataManager.count() === 0) {
      alert('画像ファイルが見つかりませんでした。');
      hideProgress();
      return;
    }
    initLabels();
    els.loadScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    setMode('select');
    showCurrentImage();
  }

function showLoadScreen() {
    els.app.classList.add('hidden');
    els.loadScreen.classList.remove('hidden');
    els.loadProgress.classList.add('hidden');
    els.fileInputFolder.value = '';
    els.fileInputZip.value = '';
  }
