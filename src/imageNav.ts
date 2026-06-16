/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * imageNav.ts – 画像ナビゲーション・現在画像の描画
 */
import DataManager from './data';
import CanvasManager from './canvas';
import Storage from './storage';
import {
  _labelColors,
  setLabels, setLabelColors, setActiveLabel,
} from './state';
import { updateProgressStats } from './ui/progress';
import { updateConfirmButton } from './ui/confirm';
import { updateZoomDisplay } from './ui/zoom';
import { renderLabelList } from './ui/labelList';
import { renderObjectList } from './ui/objectList';

function $el(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

/** ラベル一覧を DataManager と Storage から再構築してアプリ状態に反映する */
export function initLabels(): void {
  const sid = DataManager.getSessionId();
  const fromData = DataManager.collectAllLabels();
  const storedColors = sid ? Storage.getLabelColors(sid) : {};
  const fromStorage = Object.keys(storedColors);
  const newLabels = [...new Set([...fromData, ...fromStorage])].sort();

  setLabels(newLabels);
  setLabelColors({});

  for (const label of newLabels) {
    _labelColors[label] = sid
      ? Storage.getOrAssignColor(sid, label)
      : '#2563eb';
  }

  setActiveLabel(newLabels.length > 0 ? newLabels[0] : null);
}

/** 現在のファイルを Canvas に描画し、関連 UI を更新する */
export async function showCurrentImage(): Promise<void> {
  const file = DataManager.current();
  if (!file) return;

  $el('fileName').textContent = file.name;
  $el('fileCounter').textContent = `${DataManager.index() + 1} / ${DataManager.count()}`;

  updateProgressStats();
  updateConfirmButton(file.name, DataManager.getSessionId());

  try {
    await CanvasManager.loadImage(file.imageURL);
  } catch (err) {
    console.error(err);
  }

  const shapes = DataManager.getShapes(file);
  CanvasManager.setShapes(shapes, _labelColors);
  renderObjectList(shapes);
  renderLabelList();
  updateZoomDisplay(CanvasManager.getZoom());
}