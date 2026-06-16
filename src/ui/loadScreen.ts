/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/loadScreen.ts - ロード画面処理 */
import DataManager from '../data';
import type { AppMode } from '../types/app';

export interface LoadScreenCallbacks {
  closeVersionModal: () => void;
  showProgress: () => void;
  updateProgress: (done: number, total: number) => void;
  hideProgress: () => void;
  initLabels: () => void;
  hideLoadScreen: () => void;
  setMode: (mode: AppMode) => void;
  showCurrentImage: () => void;
}

export interface LoadScreenElements {
  app: HTMLElement;
  loadScreen: HTMLElement;
  loadProgress: HTMLElement;
  fileInputFolder: HTMLInputElement;
  fileInputZip: HTMLInputElement;
}

export async function onFolderSelected(e: Event, callbacks: LoadScreenCallbacks): Promise<void> {
  const files = (e.target as HTMLInputElement).files;
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
  (e.target as HTMLInputElement).value = '';
}

export async function onZipSelected(e: Event, callbacks: LoadScreenCallbacks): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0];
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
  (e.target as HTMLInputElement).value = '';
}

export function onDataLoaded(callbacks: LoadScreenCallbacks): void {
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

export function showLoadScreen(els: LoadScreenElements): void {
  els.app.classList.add('hidden');
  els.loadScreen.classList.remove('hidden');
  els.loadProgress.classList.add('hidden');
  els.fileInputFolder.value = '';
  els.fileInputZip.value = '';
}