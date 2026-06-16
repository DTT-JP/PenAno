/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* ui/objectList.ts - オブジェクトリスト UI */
import DataManager from '../data';
import CanvasManager from '../canvas';
import { _labelColors } from '../state';
import type { LabelMeShape } from '../types/labelme';

export function renderObjectList(shapes: LabelMeShape[]): void {
  const objectList = document.getElementById('objectList') as HTMLElement;
  const objCount = document.getElementById('objCount') as HTMLElement;
  objectList.innerHTML = '';
  objCount.textContent = shapes ? String(shapes.length) : '0';
  if (!shapes) return;
  const selectedIdx = CanvasManager.getSelectedIdx();
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    const color = _labelColors[shape.label] || '#2563eb';
    const item = document.createElement('div');
    item.className = 'obj-item' + (i === selectedIdx ? ' selected' : '');
    const swatch = document.createElement('span');
    swatch.className = 'obj-swatch';
    swatch.style.background = color;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'obj-label';
    labelSpan.textContent = shape.label;
    const idxSpan = document.createElement('span');
    idxSpan.className = 'obj-idx';
    idxSpan.textContent = '#' + i;
    const del = document.createElement('button');
    del.className = 'obj-del';
    del.textContent = '×';
    del.addEventListener('click', e => { e.stopPropagation(); deleteObject(i); });
    item.addEventListener('click', () => { CanvasManager.setSelectedIdx(i); renderObjectList(shapes); });
    item.appendChild(swatch); item.appendChild(labelSpan); item.appendChild(idxSpan); item.appendChild(del);
    objectList.appendChild(item);
  }
}

export function deleteObject(idx: number): void {
  const file = DataManager.current();
  if (!file) return;
  DataManager.removeShape(file, idx);
  const shapes = DataManager.getShapes(file);
  CanvasManager.setShapes(shapes, _labelColors);
  renderObjectList(shapes);
}