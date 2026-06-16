/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * app.ts – アプリケーション初期化・DOM 取得・イベントバインド
 *
 * 各処理の実装は専門モジュールに委譲し、ここでは配線のみを行う。
 * DOM 要素は DOMContentLoaded 後に一括取得する。
 */
import CanvasManager from './canvas';
import DataManager from './data';
import Storage from './storage';
import { initSettings } from './settings';
import { APP_VERSION } from './version';
import { _labelColors, setLabelColors } from './state';
import { initFlyouts, openFlyout, closeFlyout } from './flyout';
import { showVersionModal, closeVersionModal } from './versionModal';
import { onDownloadZip } from './downloadZip';
import { initLabels, showCurrentImage } from './imageNav';
import { handleShapesChanged } from './canvasEvents';
import { updateProgressStats } from './ui/progress';
import { updateConfirmButton, toggleConfirm } from './ui/confirm';
import { updateZoomDisplay, onZoomInputChange } from './ui/zoom';
import { renderLabelList, onAddLabel } from './ui/labelList';
import { onFolderSelected, onZipSelected, showLoadScreen } from './ui/loadScreen';
import type { LoadScreenCallbacks, LoadScreenElements } from './ui/loadScreen';
import type { AppMode, ShapesChangedCallback } from './types/app';

// ─── DOM refs ──────────────────────────────────────────────────────────────

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

// ─── Mode helper ───────────────────────────────────────────────────────────

function setMode(mode: AppMode): void {
  CanvasManager.setMode(mode);
  $('btnModeSelect').classList.toggle('active', mode === 'select');
  $('btnModeAdd').classList.toggle('active', mode === 'add');
}

// ─── Settings callbacks ────────────────────────────────────────────────────

function getAppCallbacks() {
  return {
    getCurrentSessionId: (): string | null => DataManager.getSessionId(),
    getLabelColors: () => _labelColors,
    reloadLabelColors: (): void => {
      const sid = DataManager.getSessionId();
      if (!sid) return;
      setLabelColors(Storage.getLabelColors(sid));
      CanvasManager.setLabelColors(_labelColors);
      renderLabelList();
    },
  };
}

// ─── Init ──────────────────────────────────────────────────────────────────

export function initApp(): void {
  // Canvas
  CanvasManager.init(
    $<HTMLCanvasElement>('mainCanvas'),
    $<SVGSVGElement>('annotSvg'),
    $('canvasWrapper'),
    $('canvasArea'),
  );
  CanvasManager.onShapesChanged(handleShapesChanged as ShapesChangedCallback);

  // バージョン表示
  if (APP_VERSION) {
    $('loadVersionText').textContent = 'v' + APP_VERSION.version;
    ($('settingsVersionVal') as HTMLElement).textContent = APP_VERSION.version;
    ($('settingsDateVal') as HTMLElement).textContent = APP_VERSION.date;
  }

  bindEvents();
}

// ─── Event binding ─────────────────────────────────────────────────────────

function bindEvents(): void {
  initFlyouts();

  // ── ロード画面 ──────────────────────────────────────────────────────────
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

  // ── ファイルナビ ─────────────────────────────────────────────────────────
  $('btnPrev').addEventListener('click', () => {
    if (DataManager.prev()) showCurrentImage();
  });
  $('btnNext').addEventListener('click', () => {
    if (DataManager.next()) showCurrentImage();
  });

  // ── モード / 確認ボタン ──────────────────────────────────────────────────
  $('btnConfirm').addEventListener('click', () => toggleConfirm());
  $('btnModeSelect').addEventListener('click', () => setMode('select'));
  $('btnModeAdd').addEventListener('click', () => setMode('add'));

  // ── ズーム（サイドバー） ──────────────────────────────────────────────────
  $('btnZoomReset').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.resetZoom()));
  $('btnZoomCenter').addEventListener('click', () => CanvasManager.centerImage());

  // ── フライアウト開閉 ──────────────────────────────────────────────────────
  $('btnZoomPanel').addEventListener('click', () => openFlyout('zoom'));
  $('btnProgress').addEventListener('click', () => {
    updateProgressStats();
    openFlyout('progress');
  });
  $('btnObjPanel').addEventListener('click', () => openFlyout('objects'));
  $('btnOtherMenu').addEventListener('click', () => openFlyout('other'));

  $('flyoutOverlay').addEventListener('click', () => closeFlyout());
  document.querySelectorAll<HTMLElement>('[data-close-flyout]').forEach(btn =>
    btn.addEventListener('click', () => closeFlyout()));

  // ── ズームパネル ──────────────────────────────────────────────────────────
  $('btnZoomIn').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.zoomIn()));
  $('btnZoomOut').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.zoomOut()));
  $<HTMLInputElement>('zoomInput').addEventListener('change', onZoomInputChange);
  $<HTMLInputElement>('zoomInput').addEventListener('blur', onZoomInputChange);
  $('btnZoomReset2').addEventListener('click', () =>
    updateZoomDisplay(CanvasManager.resetZoom()));
  $('btnZoomCenter2').addEventListener('click', () => CanvasManager.centerImage());

  // ── ラベル追加 ────────────────────────────────────────────────────────────
  $('btnAddLabel').addEventListener('click', () => {
    $('addLabelForm').classList.toggle('hidden');
    if (!$('addLabelForm').classList.contains('hidden')) {
      $<HTMLInputElement>('newLabelInput').focus();
    }
  });
  $('btnConfirmAddLabel').addEventListener('click', onAddLabel);
  $('btnCancelAddLabel').addEventListener('click', () => {
    $('addLabelForm').classList.add('hidden');
    $<HTMLInputElement>('newLabelInput').value = '';
  });
  $<HTMLInputElement>('newLabelInput').addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') onAddLabel();
    if (e.key === 'Escape') {
      $('addLabelForm').classList.add('hidden');
      $<HTMLInputElement>('newLabelInput').value = '';
    }
  });

  // ── その他メニュー ────────────────────────────────────────────────────────
  $('btnDownloadZip').addEventListener('click', () => {
    closeFlyout();
    onDownloadZip();
  });
  $('btnReload').addEventListener('click', () => {
    closeFlyout();
    const loadScreenEls: LoadScreenElements = {
      app: $('app'),
      loadScreen: $('loadScreen'),
      loadProgress: $('loadProgress'),
      fileInputFolder: $<HTMLInputElement>('fileInputFolder'),
      fileInputZip: $<HTMLInputElement>('fileInputZip'),
    };
    showLoadScreen(loadScreenEls);
  });
  $('btnVersionInfo').addEventListener('click', () => {
    closeFlyout();
    showVersionModal();
  });

  // ── バージョンモーダル ────────────────────────────────────────────────────
  $('btnCloseModal').addEventListener('click', closeVersionModal);
  $('modalVersion').addEventListener('click', (e: MouseEvent) => {
    if (e.target === $('modalVersion')) closeVersionModal();
  });

  // ── 設定パネル ────────────────────────────────────────────────────────────
  try {
    initSettings(getAppCallbacks());
  } catch (e) {
    console.error('initSettings:', e);
  }
}