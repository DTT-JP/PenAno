/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * events/loadScreenEvents.ts – ロード画面のイベントバインド
 */
import DataManager from '../data';
import { APP_VERSION } from '../version';
import { initLabels, showCurrentImage } from '../imageNav';
import { showVersionModal, closeVersionModal } from '../versionModal';
import { onFolderSelected, onZipSelected, showLoadScreen } from '../ui/loadScreen';
import type { LoadScreenCallbacks, LoadScreenElements } from '../ui/loadScreen';
import type { AppMode } from '../types/app';

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

export function bindLoadScreenEvents(setMode: (m: AppMode) => void): void {
  const loadCb: LoadScreenCallbacks = {
    closeVersionModal,
    showProgress: () => {
      $('loadProgress').classList.remove('hidden');
      ($('progressFill') as HTMLElement).style.width = '0%';
      $('progressText').textContent = '読み込み中...';
    },
    updateProgress: (done: number, total: number) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      ($('progressFill') as HTMLElement).style.width = pct + '%';
      $('progressText').textContent = `読み込み中... ${done} / ${total}`;
    },
    hideProgress: () => $('loadProgress').classList.add('hidden'),
    hideLoadScreen: () => {
      $('loadScreen').classList.add('hidden');
      $('app').classList.remove('hidden');
    },
    initLabels,
    setMode,
    showCurrentImage: () => showCurrentImage(),
  };

  $('btnLoadFolder').addEventListener('click', () =>
    ($<HTMLInputElement>('fileInputFolder')).click());
  $('btnLoadZip').addEventListener('click', () =>
    ($<HTMLInputElement>('fileInputZip')).click());
  $<HTMLInputElement>('fileInputFolder').addEventListener('change', e =>
    onFolderSelected(e, loadCb));
  $<HTMLInputElement>('fileInputZip').addEventListener('change', e =>
    onZipSelected(e, loadCb));

  $('btnLoadVersionInfo').addEventListener('click', () => showVersionModal());
  $('loadVersionText').addEventListener('click', () => showVersionModal());
}

export function bindReloadEvent(setMode: (m: AppMode) => void): void {
  $('btnReload').addEventListener('click', () => {
    const loadScreenEls: LoadScreenElements = {
      app: $('app'),
      loadScreen: $('loadScreen'),
      loadProgress: $('loadProgress'),
      fileInputFolder: $<HTMLInputElement>('fileInputFolder'),
      fileInputZip: $<HTMLInputElement>('fileInputZip'),
    };
    showLoadScreen(loadScreenEls);
  });
}