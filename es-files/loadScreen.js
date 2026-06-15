/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/loadScreen.js - ロード画面処理 */
import DataManager from '../data.js';

export async function onFolderSelected(e, callbacks) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  callbacks.closeVersionModal();
  callbacks.showProgress();
  try {
    await DataManager.loadFromFileList(files, (d, t) => callbacks.updateProgress(d, t));
    onDataLoaded(callbacks);
  } catch (err) {
    console.error(err);
    alert('ファイルの読み込みに失敗しました。');
    callbacks.hideProgress();
  }
  e.target.value = '';
}

export async function onZipSelected(e, callbacks) {
  const file = e.target.files[0];
  if (!file) return;
  callbacks.closeVersionModal();
  callbacks.showProgress();
  try {
    await DataManager.loadFromZip(file, (d, t) => callbacks.updateProgress(d, t));
    onDataLoaded(callbacks);
  } catch (err) {
    console.error(err);
    alert('ZIPファイルの読み込みに失敗しました。');
    callbacks.hideProgress();
  }
  e.target.value = '';
}

export function onDataLoaded(callbacks) {
  if (DataManager.count() === 0) {
    alert('画像ファイルが見つかりませんでした。');
    callbacks.hideProgress();
    return;
  }
  callbacks.initLabels();
  callbacks.hideLoadScreen();
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
