/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * canvasEvents.ts – CanvasManager からのコールバック処理
 *
 * addShape / shapeUpdated / select / zoom の各イベントを受け取り、
 * DataManager への永続化と UI 更新を行う。
 */
import DataManager from './data';
import CanvasManager from './canvas';
import Storage from './storage';
import { _labels, _labelColors, _activeLabel, setLabels, setActiveLabel } from './state';
import { renderLabelList } from './ui/labelList';
import { renderObjectList } from './ui/objectList';
import { updateZoomDisplay } from './ui/zoom';
import type { ShapesChangedEventType, AddShapeEventData } from './types/app';

export function handleShapesChanged(
  eventType: ShapesChangedEventType,
  data: number | AddShapeEventData | null,
): void {
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
      const { x1, y1, x2, y2 } = data as AddShapeEventData;
      const shape = DataManager.makeRectShape(label, x1, y1, x2, y2, w, h);

      const sid = DataManager.getSessionId();
      if (!_labels.includes(label)) {
        const updated = [..._labels, label].sort();
        setLabels(updated);
        _labelColors[label] = sid ? Storage.getOrAssignColor(sid, label) : '#2563eb';
        setActiveLabel(label);
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
      if (idx >= 0 && idx < shapes.length) {
        DataManager.updateShape(file, idx, shapes[idx]);
      }
      break;
    }

    case 'zoom': {
      updateZoomDisplay(CanvasManager.getZoom());
      break;
    }
  }
}