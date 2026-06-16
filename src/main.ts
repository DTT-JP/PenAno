/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * main.ts – メインアプリケーションロジック
 */
import { registerSW } from 'virtual:pwa-register';
import JSZip from 'jszip';
import { marked } from 'marked';

import { APP_VERSION } from './version';
import Storage from './storage';
import DataManager from './data';
import CanvasManager from './canvas';
import { initSettings } from './settings';
import {
  _labels, _labelColors, _activeLabel,
  setLabels, setLabelColors, setActiveLabel
} from './state';
import { updateProgressStats } from './ui/progress';
import { updateConfirmButton, toggleConfirm } from './ui/confirm';
import { updateZoomDisplay, onZoomInputChange } from './ui/zoom';
import { renderLabelList, onAddLabel } from './ui/labelList';
import { renderObjectList } from './ui/objectList';
import { onFolderSelected, onZipSelected, showLoadScreen } from './ui/loadScreen';
import type { LoadScreenCallbacks, LoadScreenElements } from './ui/loadScreen';
import type { AppMode, ShapesChangedCallback, ShapesChangedEventType, AddShapeEventData } from './types/app';

// PWA登録
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('新しいバージョンが利用可能です。');
  },
  onOfflineReady() {
    console.log('オフラインでの利用準備が完了しました。');
  },
});
void updateSW;

// ─── DOM Refs ──────────────────────────────────────────────

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

interface AppElements {
  loadScreen:          HTMLElement;
  btnLoadFolder:       HTMLElement;
  btnLoadZip:          HTMLElement;
  fileInputFolder:     HTMLInputElement;
  fileInputZip:        HTMLInputElement;
  loadProgress:        HTMLElement;
  progressFill:        HTMLElement;
  progressText:        HTMLElement;
  loadVersionText:     HTMLElement;
  btnLoadVersionInfo:  HTMLElement;

  app:                 HTMLElement;

  btnPrev:             HTMLElement;
  btnNext:             HTMLElement;
  fileName:            HTMLElement;
  fileCounter:         HTMLElement;

  btnConfirm:          HTMLElement;
  confirmLabel:        HTMLElement;
  btnModeSelect:       HTMLElement;
  btnModeAdd:          HTMLElement;
  btnProgress:         HTMLElement;

  btnZoomReset:        HTMLElement;
  btnZoomCenter:       HTMLElement;
  btnZoomPanel:        HTMLElement;

  labelList:           HTMLElement;
  btnObjPanel:         HTMLElement;
  btnAddLabel:         HTMLElement;
  addLabelForm:        HTMLElement;
  newLabelInput:       HTMLInputElement;
  newLabelColor:       HTMLInputElement;
  btnConfirmAddLabel:  HTMLElement;
  btnCancelAddLabel:   HTMLElement;

  btnOtherMenu:        HTMLElement;

  canvasArea:          HTMLElement;
  canvasWrapper:       HTMLElement;
  mainCanvas:          HTMLCanvasElement;
  annotSvg:            SVGSVGElement;

  flyoutOverlay:       HTMLElement;
  flyoutZoom:          HTMLElement;
  flyoutProgress:      HTMLElement;
  flyoutObjects:       HTMLElement;
  flyoutOther:         HTMLElement;

  btnZoomOut:          HTMLElement;
  btnZoomIn:           HTMLElement;
  zoomInput:           HTMLInputElement;
  btnZoomReset2:       HTMLElement;
  btnZoomCenter2:      HTMLElement;

  statTotal:           HTMLElement;
  statDone:            HTMLElement;
  statLeft:            HTMLElement;

  objCount:            HTMLElement;
  objectList:          HTMLElement;

  btnDownloadZip:      HTMLElement;
  btnReload:           HTMLElement;
  btnVersionInfo:      HTMLElement;

  modalVersion:        HTMLElement;
  modalVersionTitle:   HTMLElement;
  mdContent:           HTMLElement;
  mdOlderLink:         HTMLElement;
  mdOlderLinkAnchor:   HTMLAnchorElement;
  btnCloseModal:       HTMLElement;
}

let els: AppElements;

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  els = {
    loadScreen:          $('loadScreen'),
    btnLoadFolder:       $('btnLoadFolder'),
    btnLoadZip:          $('btnLoadZip'),
    fileInputFolder:     $<HTMLInputElement>('fileInputFolder'),
    fileInputZip:        $<HTMLInputElement>('fileInputZip'),
    loadProgress:        $('loadProgress'),
    progressFill:        $('progressFill'),
    progressText:        $('progressText'),
    loadVersionText:     $('loadVersionText'),
    btnLoadVersionInfo:  $('btnLoadVersionInfo'),

    app:                 $('app'),

    btnPrev:             $('btnPrev'),
    btnNext:             $('btnNext'),
    fileName:            $('fileName'),
    fileCounter:         $('fileCounter'),

    btnConfirm:          $('btnConfirm'),
    confirmLabel:        $('confirmLabel'),
    btnModeSelect:       $('btnModeSelect'),
    btnModeAdd:          $('btnModeAdd'),
    btnProgress:         $('btnProgress'),

    btnZoomReset:        $('btnZoomReset'),
    btnZoomCenter:       $('btnZoomCenter'),
    btnZoomPanel:        $('btnZoomPanel'),

    labelList:           $('labelList'),
    btnObjPanel:         $('btnObjPanel'),
    btnAddLabel:         $('btnAddLabel'),
    addLabelForm:        $('addLabelForm'),
    newLabelInput:       $<HTMLInputElement>('newLabelInput'),
    newLabelColor:       $<HTMLInputElement>('newLabelColor'),
    btnConfirmAddLabel:  $('btnConfirmAddLabel'),
    btnCancelAddLabel:   $('btnCancelAddLabel'),

    btnOtherMenu:        $('btnOtherMenu'),

    canvasArea:          $('canvasArea'),
    canvasWrapper:       $('canvasWrapper'),
    mainCanvas:          $<HTMLCanvasElement>('mainCanvas'),
    annotSvg:            $<SVGSVGElement>('annotSvg'),

    flyoutOverlay:       $('flyoutOverlay'),
    flyoutZoom:          $('flyoutZoom'),
    flyoutProgress:      $('flyoutProgress'),
    flyoutObjects:       $('flyoutObjects'),
    flyoutOther:         $('flyoutOther'),

    btnZoomOut:          $('btnZoomOut'),
    btnZoomIn:           $('btnZoomIn'),
    zoomInput:           $<HTMLInputElement>('zoomInput'),
    btnZoomReset2:       $('btnZoomReset2'),
    btnZoomCenter2:      $('btnZoomCenter2'),

    statTotal:           $('statTotal'),
    statDone:            $('statDone'),
    statLeft:            $('statLeft'),

    objCount:            $('objCount'),
    objectList:          $('objectList'),

    btnDownloadZip:      $('btnDownloadZip'),
    btnReload:           $('btnReload'),
    btnVersionInfo:      $('btnVersionInfo'),

    modalVersion:        $('modalVersion'),
    modalVersionTitle:   $('modalVersionTitle'),
    mdContent:           $('mdContent'),
    mdOlderLink:         $('mdOlderLink'),
    mdOlderLinkAnchor:   $<HTMLAnchorElement>('mdOlderLinkAnchor'),
    btnCloseModal:       $('btnCloseModal'),
  };

  CanvasManager.init(els.mainCanvas, els.annotSvg, els.canvasWrapper, els.canvasArea);
  CanvasManager.onShapesChanged(handleShapesChanged as ShapesChangedCallback);

  if (APP_VERSION) {
    els.loadVersionText.textContent = 'v' + APP_VERSION.version;
  }

  bindEvents();
});

// ─── Flyout helpers ────────────────────────────────────────
interface FlyoutEntry { panel: HTMLElement; btn: HTMLElement; }
const FLYOUTS: Record<string, FlyoutEntry> = {};
let _activeFlyout: string | null = null;

function initFlyouts(): void {
  FLYOUTS.zoom     = { panel: $('flyoutZoom'),     btn: $('btnZoomPanel') };
  FLYOUTS.progress = { panel: $('flyoutProgress'), btn: $('btnProgress') };
  FLYOUTS.objects  = { panel: $('flyoutObjects'),  btn: $('btnObjPanel') };
  FLYOUTS.other    = { panel: $('flyoutOther'),    btn: $('btnOtherMenu') };
}

function openFlyout(name: string): void {
  const flyoutOverlay = $('flyoutOverlay');
  if (_activeFlyout === name) { closeFlyout(); return; }
  closeFlyout(false);
  _activeFlyout = name;
  FLYOUTS[name].panel.classList.add('open');
  FLYOUTS[name].btn.classList.add('open');
  flyoutOverlay.classList.add('open');
}

function closeFlyout(resetOverlay: boolean = true): void {
  const flyoutOverlay = $('flyoutOverlay');
  if (_activeFlyout) {
    FLYOUTS[_activeFlyout].panel.classList.remove('open');
    FLYOUTS[_activeFlyout].btn.classList.remove('open');
    _activeFlyout = null;
  }
  if (resetOverlay) flyoutOverlay.classList.remove('open');
}

// ─── Event Binding ─────────────────────────────────────────
function bindEvents(): void {
  initFlyouts();

  const loadCallbacks: LoadScreenCallbacks = {
    closeVersionModal,
    showProgress: () => {
      els.loadProgress.classList.remove('hidden');
      els.progressFill.style.width = '0%';
      els.progressText.textContent = '読み込み中...';
    },
    updateProgress: (done: number, total: number) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      els.progressFill.style.width = pct + '%';
      els.progressText.textContent = `読み込み中... ${done} / ${total}`;
    },
    hideProgress: () => els.loadProgress.classList.add('hidden'),
    hideLoadScreen: () => {
      els.loadScreen.classList.add('hidden');
      els.app.classList.remove('hidden');
    },
    initLabels,
    setMode,
    showCurrentImage,
  };

  els.btnLoadFolder.addEventListener('click', () => els.fileInputFolder.click());
  els.btnLoadZip.addEventListener('click', () => els.fileInputZip.click());
  els.fileInputFolder.addEventListener('change', e => onFolderSelected(e, loadCallbacks));
  els.fileInputZip.addEventListener('change', e => onZipSelected(e, loadCallbacks));

  els.btnLoadVersionInfo.addEventListener('click', () => showVersionModal());
  els.loadVersionText.addEventListener('click', () => showVersionModal());

  els.btnPrev.addEventListener('click', () => { if (DataManager.prev()) showCurrentImage(); });
  els.btnNext.addEventListener('click', () => { if (DataManager.next()) showCurrentImage(); });

  els.btnConfirm.addEventListener('click', () => toggleConfirm());
  els.btnModeSelect.addEventListener('click', () => setMode('select'));
  els.btnModeAdd.addEventListener('click', () => setMode('add'));

  els.btnZoomReset.addEventListener('click', () => updateZoomDisplay(CanvasManager.resetZoom()));
  els.btnZoomCenter.addEventListener('click', () => CanvasManager.centerImage());

  els.btnZoomPanel.addEventListener('click', () => openFlyout('zoom'));
  els.btnProgress.addEventListener('click', () => { updateProgressStats(); openFlyout('progress'); });
  els.btnObjPanel.addEventListener('click', () => openFlyout('objects'));
  els.btnOtherMenu.addEventListener('click', () => openFlyout('other'));

  els.flyoutOverlay.addEventListener('click', () => closeFlyout());
  document.querySelectorAll<HTMLElement>('[data-close-flyout]').forEach(btn => {
    btn.addEventListener('click', () => closeFlyout());
  });

  els.btnZoomIn.addEventListener('click',  () => updateZoomDisplay(CanvasManager.zoomIn()));
  els.btnZoomOut.addEventListener('click', () => updateZoomDisplay(CanvasManager.zoomOut()));
  els.zoomInput.addEventListener('change', onZoomInputChange);
  els.zoomInput.addEventListener('blur',   onZoomInputChange);
  els.btnZoomReset2.addEventListener('click',  () => updateZoomDisplay(CanvasManager.resetZoom()));
  els.btnZoomCenter2.addEventListener('click', () => CanvasManager.centerImage());

  els.btnAddLabel.addEventListener('click', () => {
    els.addLabelForm.classList.toggle('hidden');
    if (!els.addLabelForm.classList.contains('hidden')) els.newLabelInput.focus();
  });
  els.btnConfirmAddLabel.addEventListener('click', onAddLabel);
  els.btnCancelAddLabel.addEventListener('click', () => {
    els.addLabelForm.classList.add('hidden');
    els.newLabelInput.value = '';
  });
  els.newLabelInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') onAddLabel();
    if (e.key === 'Escape') { els.addLabelForm.classList.add('hidden'); els.newLabelInput.value = ''; }
  });

  els.btnDownloadZip.addEventListener('click', () => { closeFlyout(); onDownloadZip(); });
  els.btnReload.addEventListener('click', () => {
    closeFlyout();
    const loadScreenEls: LoadScreenElements = {
      app:             els.app,
      loadScreen:      els.loadScreen,
      loadProgress:    els.loadProgress,
      fileInputFolder: els.fileInputFolder,
      fileInputZip:    els.fileInputZip,
    };
    showLoadScreen(loadScreenEls);
  });
  els.btnVersionInfo.addEventListener('click', () => { closeFlyout(); showVersionModal(); });

  els.btnCloseModal.addEventListener('click', closeVersionModal);
  els.modalVersion.addEventListener('click', (e: MouseEvent) => {
    if (e.target === els.modalVersion) closeVersionModal();
  });

  const vEl = $('settingsVersionVal');
  const dEl = $('settingsDateVal');
  if (vEl && APP_VERSION) vEl.textContent = APP_VERSION.version;
  if (dEl && APP_VERSION) dEl.textContent = APP_VERSION.date;

  try { initSettings(getAppCallbacks()); } catch(e) { console.error('initSettings:', e); }
}

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

// ─── Labels ────────────────────────────────────────────────
function initLabels(): void {
  const sid = DataManager.getSessionId();
  const fromData = DataManager.collectAllLabels();
  const storedColors = sid ? Storage.getLabelColors(sid) : {};
  const fromStorage = Object.keys(storedColors);
  const labelSet = new Set([...fromData, ...fromStorage]);
  setLabels([...labelSet].sort());
  setLabelColors({});
  for (const label of _labels) {
    _labelColors[label] = sid
      ? Storage.getOrAssignColor(sid, label)
      : '#2563eb';
  }
  setActiveLabel(_labels.length > 0 ? _labels[0] : null);
}

// ─── Show Current Image ────────────────────────────────────
async function showCurrentImage(): Promise<void> {
  const file = DataManager.current();
  if (!file) return;
  els.fileName.textContent = file.name;
  els.fileCounter.textContent = `${DataManager.index() + 1} / ${DataManager.count()}`;
  updateProgressStats();
  const sid = DataManager.getSessionId();
  updateConfirmButton(file.name, sid);
  try { await CanvasManager.loadImage(file.imageURL); } catch(err) { console.error(err); }
  const shapes = DataManager.getShapes(file);
  CanvasManager.setShapes(shapes, _labelColors);
  renderObjectList(shapes);
  renderLabelList();
  updateZoomDisplay(CanvasManager.getZoom());
}

// ─── Mode ──────────────────────────────────────────────────
function setMode(mode: AppMode): void {
  CanvasManager.setMode(mode);
  els.btnModeSelect.classList.toggle('active', mode === 'select');
  els.btnModeAdd.classList.toggle('active', mode === 'add');
}

// ─── Canvas Callback ──────────────────────────────────────
function handleShapesChanged(eventType: ShapesChangedEventType, data: number | AddShapeEventData | null): void {
  const file = DataManager.current();
  if (!file) return;
  switch (eventType) {
    case 'select': {
      const shapes = DataManager.getShapes(file);
      renderObjectList(shapes);
      break;
    }
    case 'addShape': {
      const label = _activeLabel;
      if (!label) {
        alert('ラベルを選択してください。\nラベル一覧からラベルをタップして選択してください。');
        return;
      }
      const { w, h } = CanvasManager.getImageSize();
      const shapeData = data as AddShapeEventData;
      const shape = DataManager.makeRectShape(label, shapeData.x1, shapeData.y1, shapeData.x2, shapeData.y2, w, h);
      const sid = DataManager.getSessionId();
      if (!_labels.includes(label)) {
        _labels.push(label);
        _labels.sort();
        _labelColors[label] = sid ? Storage.getOrAssignColor(sid, label) : '#2563eb';
        renderLabelList();
      }
      DataManager.addShape(file, shape);
      const shapes = DataManager.getShapes(file);
      CanvasManager.setShapes(shapes, _labelColors);
      CanvasManager.setSelectedIdx(shapes.length - 1);
      renderObjectList(shapes);
      break;
    }
    case 'shapeUpdated': {
      const shapes = DataManager.getShapes(file);
      const idx = data as number;
      if (idx >= 0 && idx < shapes.length) DataManager.updateShape(file, idx, shapes[idx]);
      break;
    }
    case 'zoom': {
      updateZoomDisplay(CanvasManager.getZoom());
      break;
    }
  }
}

// ─── Version Modal ─────────────────────────────────────────
async function showVersionModal(): Promise<void> {
  els.modalVersion.classList.add('open');
  const ver = APP_VERSION;
  if (!ver) { els.mdContent.innerHTML = '<p>バージョン情報が見つかりません。</p>'; return; }
  els.modalVersionTitle.textContent = `PenAno v${ver.version}`;
  els.mdContent.innerHTML = '<p style="color:var(--text2);">読み込み中...</p>';
  els.mdOlderLink.style.display = 'none';
  const docUrl = new URL(ver.docFile, document.baseURI).href + '?t=' + Date.now();
  try {
    const res = await fetch(docUrl);
    if (!res.ok) throw new Error('fetch failed: ' + res.status);
    const md = await res.text();
    els.mdContent.innerHTML = marked.parse(md) as string;
    els.mdContent.querySelectorAll<HTMLAnchorElement>('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  } catch(e) {
    const isOffline = !navigator.onLine;
    els.mdContent.innerHTML = `<h1>PenAno v${ver.version}</h1><p style="color:var(--text2);">${isOffline ? 'オフラインのため、リリースノートを取得できませんでした。' : 'リリースノートを読み込めませんでした。'}</p>`;
  }
  if (ver.githubRepo) {
    els.mdOlderLink.style.display = 'block';
    els.mdOlderLinkAnchor.href = ver.githubRepo + '/blob/main/CHANGELOG.md';
  }
}

function closeVersionModal(): void { els.modalVersion.classList.remove('open'); }

// ─── Download ZIP ──────────────────────────────────────────
async function onDownloadZip(): Promise<void> {
  const zip = new JSZip();
  let hasData = false;
  for (const file of DataManager.files) {
    if (file.json) {
      const base = file.name.replace(/\.[^.]+$/, '');
      zip.file(base + '.json', JSON.stringify(file.json, null, 2));
      hasData = true;
    }
  }
  if (!hasData) { alert('保存するデータがありません。'); return; }
  try {
    const content = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url; a.download = 'annotations.zip';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(err) { console.error(err); alert('ZIPの作成に失敗しました。'); }
}