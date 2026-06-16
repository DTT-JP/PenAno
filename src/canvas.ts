/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * canvas.ts – 画像表示・アノテーション描画・ペン/タッチ操作
 */
import type { DragState, AppMode, ShapesChangedCallback, HandleName, NormalizedRect } from './types/app';
import type { LabelMeShape } from './types/labelme';
import type { LabelColors } from './types/storage';

const CanvasManager = (() => {
  let canvas: HTMLCanvasElement;
  let svg: SVGSVGElement;
  let wrapper: HTMLElement;
  let area: HTMLElement;
  let _imgW: number = 0, _imgH: number = 0;
  let _zoom: number = 1.0;
  let _offsetX: number = 0, _offsetY: number = 0;
  let _mode: AppMode = 'select';
  let _shapes: LabelMeShape[] = [];
  let _selectedIdx: number = -1;
  let _labelColors: LabelColors = {};
  let _drag: DragState = null;
  let _onShapesChanged: ShapesChangedCallback | null = null;

  function init(canvasEl: HTMLCanvasElement, svgEl: SVGSVGElement, wrapperEl: HTMLElement, areaEl: HTMLElement): void {
    canvas = canvasEl; svg = svgEl; wrapper = wrapperEl; area = areaEl;
    area.addEventListener('pointerdown',   onPointerDown, { passive: false });
    area.addEventListener('pointermove',   onPointerMove, { passive: false });
    area.addEventListener('pointerup',     onPointerUp,   { passive: false });
    area.addEventListener('pointercancel', onPointerUp,   { passive: false });
    area.addEventListener('touchstart', onTouchStart, { passive: false });
    area.addEventListener('touchmove',  onTouchMove,  { passive: false });
    area.addEventListener('touchend',   onTouchEnd,   { passive: false });
  }

  function loadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        _imgW = img.naturalWidth; _imgH = img.naturalHeight;
        canvas.width = _imgW; canvas.height = _imgH;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        _selectedIdx = -1;
        fitToView();
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function fitToView(): void {
    const aW = area.clientWidth, aH = area.clientHeight, P = 24;
    _zoom = Math.min((aW - P*2) / _imgW, (aH - P*2) / _imgH, 1.0);
    centerImage();
  }

  function centerImage(): void {
    const aW = area.clientWidth, aH = area.clientHeight;
    _offsetX = (aW - _imgW * _zoom) / 2;
    _offsetY = (aH - _imgH * _zoom) / 2;
    applyTransform();
  }

  function applyTransform(): void {
    _offsetX = Math.max(-999999, Math.min(999999, _offsetX));
    _offsetY = Math.max(-999999, Math.min(999999, _offsetY));
    wrapper.style.width  = _imgW + 'px';
    wrapper.style.height = _imgH + 'px';
    wrapper.style.transform = `translate(${_offsetX}px,${_offsetY}px) scale(${_zoom})`;
    wrapper.style.transformOrigin = '0 0';
    svg.setAttribute('viewBox', `0 0 ${_imgW} ${_imgH}`);
  }

  function setZoom(z: number, pivotScreenX?: number, pivotScreenY?: number): number {
    const oldZ = _zoom;
    _zoom = Math.max(0.1, Math.min(8, z));
    const rect = area.getBoundingClientRect();
    const px = (pivotScreenX !== undefined ? pivotScreenX - rect.left : area.clientWidth / 2);
    const py = (pivotScreenY !== undefined ? pivotScreenY - rect.top  : area.clientHeight / 2);
    _offsetX = px - (px - _offsetX) * (_zoom / oldZ);
    _offsetY = py - (py - _offsetY) * (_zoom / oldZ);
    applyTransform();
    return _zoom;
  }

  function getZoom():   number { return _zoom; }
  function resetZoom(): number { _zoom = 1.0; centerImage(); return _zoom; }
  function zoomIn():    number { return setZoom(_zoom * 1.2); }
  function zoomOut():   number { return setZoom(_zoom / 1.2); }
  function setMode(m: AppMode): void { _mode = m; area.dataset.mode = m; area.style.cursor = m === 'add' ? 'crosshair' : ''; }
  function getMode(): AppMode { return _mode; }

  function setShapes(shapes: LabelMeShape[], labelColors: LabelColors): void {
    _shapes = shapes || [];
    _labelColors = labelColors || {};
    _selectedIdx = -1;
    renderAnnotations();
  }
  function setLabelColors(lc: LabelColors): void { _labelColors = lc; renderAnnotations(); }
  function getSelectedIdx(): number  { return _selectedIdx; }
  function setSelectedIdx(i: number): void { _selectedIdx = i; renderAnnotations(); }

  function screenToImage(sx: number, sy: number): { x: number; y: number } {
    const rect = area.getBoundingClientRect();
    return { x: (sx - rect.left - _offsetX) / _zoom, y: (sy - rect.top - _offsetY) / _zoom };
  }

  function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#','');
    return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${alpha})`;
  }
  function getColor(label: string): string { return _labelColors[label] || '#2563eb'; }

  function rectFromPoints(pts: [number, number][]): NormalizedRect | null {
    if (!pts || pts.length < 2) return null;
    const x1 = Math.min(pts[0][0], pts[1][0]), y1 = Math.min(pts[0][1], pts[1][1]);
    const x2 = Math.max(pts[0][0], pts[1][0]), y2 = Math.max(pts[0][1], pts[1][1]);
    return { x1, y1, x2, y2, w: x2-x1, h: y2-y1 };
  }

  function renderAnnotations(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    for (let i = 0; i < _shapes.length; i++) {
      const shape = _shapes[i];
      if (shape.shape_type !== 'rectangle') continue;
      const r = rectFromPoints(shape.points);
      if (!r) continue;
      const color = getColor(shape.label);
      const isSelected = (i === _selectedIdx);
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');

      const fill = document.createElementNS('http://www.w3.org/2000/svg','rect');
      fill.setAttribute('x', String(r.x1)); fill.setAttribute('y', String(r.y1));
      fill.setAttribute('width', String(r.w)); fill.setAttribute('height', String(r.h));
      fill.setAttribute('fill', hexToRgba(color, 0.2));
      fill.setAttribute('data-idx', String(i));
      g.appendChild(fill);

      const stroke = document.createElementNS('http://www.w3.org/2000/svg','rect');
      stroke.setAttribute('x', String(r.x1)); stroke.setAttribute('y', String(r.y1));
      stroke.setAttribute('width', String(r.w)); stroke.setAttribute('height', String(r.h));
      stroke.setAttribute('fill', 'none');
      stroke.setAttribute('stroke', color);
      stroke.setAttribute('stroke-width', String(isSelected ? 2.5 / _zoom : 1.5 / _zoom));
      stroke.setAttribute('data-idx', String(i));
      g.appendChild(stroke);

      if (isSelected) {
        const handles = getHandlePositions(r);
        for (const [hName, hx, hy] of handles) {
          const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
          c.setAttribute('cx', String(hx)); c.setAttribute('cy', String(hy));
          c.setAttribute('r', String(6 / _zoom));
          c.setAttribute('fill', '#fff');
          c.setAttribute('stroke', color);
          c.setAttribute('stroke-width', String(1.5 / _zoom));
          c.setAttribute('data-handle', hName);
          c.setAttribute('data-idx', String(i));
          g.appendChild(c);
        }
      }
      g.setAttribute('data-idx', String(i));
      svg.appendChild(g);
    }

    if (_drag && _drag.type === 'draw') {
      const dx = _drag.startImgX, dy = _drag.startImgY;
      const ex = _drag.curImgX,   ey = _drag.curImgY;
      const preview = document.createElementNS('http://www.w3.org/2000/svg','rect');
      preview.setAttribute('x', String(Math.min(dx,ex))); preview.setAttribute('y', String(Math.min(dy,ey)));
      preview.setAttribute('width', String(Math.abs(ex-dx))); preview.setAttribute('height', String(Math.abs(ey-dy)));
      preview.setAttribute('fill', 'rgba(37,99,235,0.12)');
      preview.setAttribute('stroke', '#3b82f6');
      preview.setAttribute('stroke-width', String(2 / _zoom));
      preview.setAttribute('stroke-dasharray', `${6/_zoom} ${3/_zoom}`);
      svg.appendChild(preview);
    }
  }

  function getHandlePositions(r: NormalizedRect): [HandleName, number, number][] {
    const mx = (r.x1 + r.x2) / 2, my = (r.y1 + r.y2) / 2;
    return [
      ['nw', r.x1, r.y1], ['n', mx, r.y1], ['ne', r.x2, r.y1],
      ['w',  r.x1, my  ],                   ['e',  r.x2, my  ],
      ['sw', r.x1, r.y2], ['s', mx, r.y2],  ['se', r.x2, r.y2],
    ];
  }

  function hitTestHandle(imgX: number, imgY: number): HandleName | null {
    if (_selectedIdx < 0) return null;
    const shape = _shapes[_selectedIdx];
    if (!shape) return null;
    const r = rectFromPoints(shape.points);
    if (!r) return null;
    const RADIUS = 10 / _zoom;
    for (const [hName, hx, hy] of getHandlePositions(r)) {
      const dx = imgX - hx, dy = imgY - hy;
      if (Math.sqrt(dx*dx + dy*dy) <= RADIUS) return hName;
    }
    return null;
  }

  function hitTestShape(imgX: number, imgY: number): number {
    for (let i = _shapes.length - 1; i >= 0; i--) {
      const shape = _shapes[i];
      if (shape.shape_type !== 'rectangle') continue;
      const r = rectFromPoints(shape.points);
      if (!r) continue;
      if (imgX >= r.x1 && imgX <= r.x2 && imgY >= r.y1 && imgY <= r.y2) return i;
    }
    return -1;
  }

  const _pointers = new Map<number, PointerEvent>();
  let _pinchDist0: number | null = null, _pinchZoom0: number | null = null;

  function onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    const { x: ix, y: iy } = screenToImage(e.clientX, e.clientY);
    if (_mode === 'select') {
      const handle = hitTestHandle(ix, iy);
      if (handle && _selectedIdx >= 0) {
        _drag = { type: 'resize', idx: _selectedIdx, handle, startImgX: ix, startImgY: iy, origPts: JSON.parse(JSON.stringify(_shapes[_selectedIdx].points)) };
        return;
      }
      const hitIdx = hitTestShape(ix, iy);
      if (hitIdx >= 0) {
        _selectedIdx = hitIdx;
        _drag = { type: 'move', idx: _selectedIdx, startImgX: ix, startImgY: iy, origPts: JSON.parse(JSON.stringify(_shapes[_selectedIdx].points)) };
        renderAnnotations();
        if (_onShapesChanged) _onShapesChanged('select', _selectedIdx);
        return;
      }
      _selectedIdx = -1;
      _drag = { type: 'pan', startX: e.clientX, startY: e.clientY, origOX: _offsetX, origOY: _offsetY };
      renderAnnotations();
      if (_onShapesChanged) _onShapesChanged('select', -1);
    } else if (_mode === 'add') {
      _drag = { type: 'draw', startImgX: ix, startImgY: iy, curImgX: ix, curImgY: iy };
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (e.pointerType === 'touch') return;
    if (!_drag) return;
    e.preventDefault();
    const { x: ix, y: iy } = screenToImage(e.clientX, e.clientY);
    if (_drag.type === 'pan') {
      _offsetX = _drag.origOX + (e.clientX - _drag.startX);
      _offsetY = _drag.origOY + (e.clientY - _drag.startY);
      applyTransform();
    } else if (_drag.type === 'draw') {
      _drag.curImgX = clampImgX(ix); _drag.curImgY = clampImgY(iy);
      renderAnnotations();
    } else if (_drag.type === 'move') {
      const dx = ix - _drag.startImgX, dy = iy - _drag.startImgY;
      const op = _drag.origPts;
      const bw = Math.abs(op[1][0] - op[0][0]), bh = Math.abs(op[1][1] - op[0][1]);
      const nx1 = Math.max(0, Math.min(_imgW - bw, op[0][0] + dx));
      const ny1 = Math.max(0, Math.min(_imgH - bh, op[0][1] + dy));
      _shapes[_drag.idx].points = [[nx1, ny1],[nx1 + bw, ny1 + bh]];
      renderAnnotations();
    } else if (_drag.type === 'resize') {
      applyResize(_drag, ix, iy); renderAnnotations();
    }
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerType === 'touch') return;
    if (!_drag) return;
    if (_drag.type === 'draw') {
      const ix = clampImgX(_drag.curImgX);
      const iy = clampImgY(_drag.curImgY);
      if (Math.abs(ix - _drag.startImgX) > 4 / _zoom && Math.abs(iy - _drag.startImgY) > 4 / _zoom) {
        if (_onShapesChanged) _onShapesChanged('addShape', { x1: _drag.startImgX, y1: _drag.startImgY, x2: ix, y2: iy });
      }
    } else if (_drag.type === 'move' || _drag.type === 'resize') {
      if (_onShapesChanged) _onShapesChanged('shapeUpdated', _drag.idx);
    }
    _drag = null; renderAnnotations();
  }

  type TouchWithType = Touch & { touchType?: string };

  let _touchPanStart: { clientX: number; clientY: number; origOX: number; origOY: number } | null = null;
  let _pinchActive: boolean = false;

  function onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touches = e.touches;
    if (touches.length === 2) {
      _pinchActive = true;
      _pinchDist0 = pinchDist(touches); _pinchZoom0 = _zoom;
      _touchPanStart = null; _drag = null; return;
    }
    if (touches.length === 1) {
      const t = touches[0] as TouchWithType;
      const isPencil = t.touchType === 'stylus' || ((e.changedTouches[0] as TouchWithType)?.touchType === 'stylus');
      const { x: ix, y: iy } = screenToImage(t.clientX, t.clientY);
      if (isPencil) {
        if (_mode === 'select') {
          const handle = hitTestHandle(ix, iy);
          if (handle && _selectedIdx >= 0) {
            _drag = { type: 'resize', idx: _selectedIdx, handle, startImgX: ix, startImgY: iy, origPts: JSON.parse(JSON.stringify(_shapes[_selectedIdx].points)) };
            return;
          }
          const hitIdx = hitTestShape(ix, iy);
          if (hitIdx >= 0) {
            _selectedIdx = hitIdx;
            _drag = { type: 'move', idx: _selectedIdx, startImgX: ix, startImgY: iy, origPts: JSON.parse(JSON.stringify(_shapes[_selectedIdx].points)) };
            renderAnnotations();
            if (_onShapesChanged) _onShapesChanged('select', _selectedIdx);
            return;
          }
        } else if (_mode === 'add') {
          _drag = { type: 'draw', startImgX: ix, startImgY: iy, curImgX: ix, curImgY: iy }; return;
        }
      }
      _touchPanStart = { clientX: t.clientX, clientY: t.clientY, origOX: _offsetX, origOY: _offsetY };
    }
  }

  function onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touches = e.touches;
    if (_pinchActive && touches.length === 2) {
      const d = pinchDist(touches);
      if (_pinchDist0 !== null && _pinchDist0 > 0 && _pinchZoom0 !== null) {
        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        setZoom(_pinchZoom0 * d / _pinchDist0, midX, midY);
        if (_onShapesChanged) _onShapesChanged('zoom', null);
      }
      return;
    }
    if (touches.length === 1) {
      const t = touches[0] as TouchWithType;
      const isPencil = t.touchType === 'stylus';
      const { x: ix, y: iy } = screenToImage(t.clientX, t.clientY);
      if (isPencil && _drag) {
        if (_drag.type === 'draw') {
          _drag.curImgX = clampImgX(ix); _drag.curImgY = clampImgY(iy); renderAnnotations();
        } else if (_drag.type === 'move') {
          const dx = ix - _drag.startImgX, dy = iy - _drag.startImgY;
          const op = _drag.origPts;
          const bw = Math.abs(op[1][0] - op[0][0]), bh = Math.abs(op[1][1] - op[0][1]);
          const nx1 = Math.max(0, Math.min(_imgW - bw, op[0][0] + dx));
          const ny1 = Math.max(0, Math.min(_imgH - bh, op[0][1] + dy));
          _shapes[_drag.idx].points = [[nx1, ny1],[nx1 + bw, ny1 + bh]];
          renderAnnotations();
        } else if (_drag.type === 'resize') {
          applyResize(_drag, ix, iy); renderAnnotations();
        }
        return;
      }
      if (_touchPanStart) {
        _offsetX = _touchPanStart.origOX + (t.clientX - _touchPanStart.clientX);
        _offsetY = _touchPanStart.origOY + (t.clientY - _touchPanStart.clientY);
        applyTransform();
      }
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) _pinchActive = false;
    if (_drag) {
      const t = e.changedTouches[0] as TouchWithType | undefined;
      if (!t) { _drag = null; return; }
      if (t.touchType === 'stylus') {
        const { x: ix, y: iy } = screenToImage(t.clientX, t.clientY);
        if (_drag.type === 'draw') {
          const ex = clampImgX(ix), ey = clampImgY(iy);
          if (Math.abs(ex - _drag.startImgX) > 4 / _zoom && Math.abs(ey - _drag.startImgY) > 4 / _zoom) {
            if (_onShapesChanged) _onShapesChanged('addShape', { x1: _drag.startImgX, y1: _drag.startImgY, x2: ex, y2: ey });
          }
        } else if (_drag.type === 'move' || _drag.type === 'resize') {
          if (_onShapesChanged) _onShapesChanged('shapeUpdated', _drag.idx);
        }
        _drag = null; renderAnnotations(); return;
      }
    }
    _touchPanStart = null; _drag = null;
  }

  function pinchDist(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function applyResize(drag: Extract<DragState, { type: 'resize' }>, ix: number, iy: number): void {
    const op = drag.origPts;
    let x1 = Math.min(op[0][0], op[1][0]), y1 = Math.min(op[0][1], op[1][1]);
    let x2 = Math.max(op[0][0], op[1][0]), y2 = Math.max(op[0][1], op[1][1]);
    const h = drag.handle;
    const rix = clampImgX(ix), riy = clampImgY(iy);
    if (h.includes('n')) y1 = Math.min(riy, y2 - 2);
    if (h.includes('s')) y2 = Math.max(riy, y1 + 2);
    if (h.includes('w')) x1 = Math.min(rix, x2 - 2);
    if (h.includes('e')) x2 = Math.max(rix, x1 + 2);
    x1 = Math.max(0, x1); y1 = Math.max(0, y1);
    x2 = Math.min(_imgW, x2); y2 = Math.min(_imgH, y2);
    _shapes[drag.idx].points = [[x1, y1],[x2, y2]];
  }

  function clampImgX(x: number): number { return Math.max(0, Math.min(_imgW, x)); }
  function clampImgY(y: number): number { return Math.max(0, Math.min(_imgH, y)); }

  function onShapesChanged(cb: ShapesChangedCallback): void { _onShapesChanged = cb; }
  function getImageSize(): { w: number; h: number } { return { w: _imgW, h: _imgH }; }

  // _pointers は将来のマルチポインター対応用に保持
  void _pointers;

  return { init, loadImage, fitToView, resetZoom, centerImage, setZoom, getZoom, zoomIn, zoomOut, setMode, getMode, setShapes, setLabelColors, setSelectedIdx, getSelectedIdx, renderAnnotations, onShapesChanged, getImageSize };
})();

export { CanvasManager };
export default CanvasManager;