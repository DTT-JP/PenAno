/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * app.ts – アプリケーション初期化・イベント配線のエントリポイント
 *
 * Canvas の初期化とバージョン表示のみを担い、
 * イベントバインドは events/ 以下の各モジュールに委譲する。
 */
import CanvasManager from './canvas';
import DataManager from './data';
import Storage from './storage';
import { APP_VERSION } from './version';
import { _labelColors, setLabelColors } from './state';
import { renderLabelList } from './ui/labelList';
import { showLoadScreen } from './ui/loadScreen';
import { handleShapesChanged } from './canvasEvents';
import { bindLoadScreenEvents } from './events/loadScreenEvents';
import { bindNavigationEvents } from './events/navigationEvents';
import { bindFlyoutEvents, bindZoomPanelEvents } from './events/flyoutEvents';
import { bindLabelEvents } from './events/labelEvents';
import { bindMenuEvents } from './events/menuEvents';
import type { AppMode, ShapesChangedCallback } from './types/app';

// ─── DOM ヘルパー ──────────────────────────────────────────────────────────

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

// ─── モード切替（複数モジュールから参照されるため app.ts で定義） ───────────

export function setMode(mode: AppMode): void {
  CanvasManager.setMode(mode);
  $('btnModeSelect').classList.toggle('active', mode === 'select');
  $('btnModeAdd').classList.toggle('active', mode === 'add');
}

// ─── 設定パネル用コールバック ──────────────────────────────────────────────

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

// ─── ロード画面への戻り処理（menuEvents から呼ばれる） ─────────────────────

function openLoadScreen(): void {
  showLoadScreen({
    app: $('app'),
    loadScreen: $('loadScreen'),
    loadProgress: $('loadProgress'),
    fileInputFolder: $<HTMLInputElement>('fileInputFolder'),
    fileInputZip: $<HTMLInputElement>('fileInputZip'),
  });
}

// ─── アプリ初期化 ──────────────────────────────────────────────────────────

export function initApp(): void {
  // Canvas 初期化
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

  // イベントバインド（責務ごとに各モジュールへ委譲）
  bindFlyoutEvents();
  bindLoadScreenEvents(setMode);
  bindNavigationEvents(setMode);
  bindZoomPanelEvents();
  bindLabelEvents();
  bindMenuEvents(getAppCallbacks(), openLoadScreen);
}