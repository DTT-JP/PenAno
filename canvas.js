/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * canvas.js – 画像表示・アノテーション描画・ペン/タッチ操作
 */
const CanvasManager = (() => {
  let canvas, svg, wrapper, area;
  let _imgW = 0, _imgH = 0;
  let _zoom = 1.0;
  let _offsetX = 0, _offsetY = 0;
  let _mode = 'select';
  let _shapes = [];
  let _selectedIdx = -1;
  let _labelColors = {};
  let _activeLabel = null;
  let _behaviorSettings = {};
  let _drag = null;
  let _justAdded = false;
  let _onShapesChanged = null;
  const HANDLE_HIT_RADIUS_SCREEN = 12;
  let _annotationLayer = null;
  let _crosshairLayer = null;
  let _crosshairH = null;
  let _crosshairV = null;

  function init(canvasEl, svgEl, wrapperEl, areaEl) {
    canvas = canvasEl; svg = svgEl; wrapper = wrapperEl; area = areaEl;
    initSvgLayers();
    area.addEventListener('pointerdown', onPointerDown, { passive: false });
    area.addEventListener('pointermove', onPointerMove, { passive: false });
    area.addEventListener('pointerleave', onPointerLeave, { passive: false });
    area.addEventListener('pointerup',   onPointerUp,   { passive: false });
    area.addEventListener('pointercancel', onPointerCancel, { passive: false });
    area.addEventListener('touchstart', onTouchStart, { passive: false });
    area.addEventListener('touchmove',  onTouchMove,  { passive: false });
    area.addEventListener('touchend',   onTouchEnd,   { passive: false });
  }

  function loadImage(url, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        _imgW = img.naturalWidth; _imgH = img.naturalHeight;
        canvas.width = _imgW; canvas.height = _imgH;
        canvas.getContext('2d').drawImage(img, 0, 0);
        _selectedIdx = -1;
        _justAdded = false;
        fitToView(options);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function fitToView(options = {}) {
    const aW = area.clientWidth, aH = area.clientHeight, P = 24;
    if (!options.keepZoom) {
      _zoom = Math.min((aW - P*2) / _imgW, (aH - P*2) / _imgH, 1.0);
    }
    if (!options.keepPosition) centerImage();
    else applyTransform();
  }

  function centerImage() {
    const aW = area.clientWidth, aH = area.clientHeight;
    _offsetX = (aW - _imgW * _zoom) / 2;
    _offsetY = (aH - _imgH * _zoom) / 2;
    applyTransform();
  }

  function applyTransform() {
    _offsetX = Math.max(-999999, Math.min(999999, _offsetX));
    _offsetY = Math.max(-999999, Math.min(999999, _offsetY));
    wrapper.style.width  = _imgW + 'px';
    wrapper.style.height = _imgH + 'px';
    wrapper.style.transform = `translate(${_offsetX}px,${_offsetY}px) scale(${_zoom})`;
    wrapper.style.transformOrigin = '0 0';
    svg.setAttribute('viewBox', `0 0 ${_imgW} ${_imgH}`);
    updateCrosshairScale();
  }

  function setZoom(z, pivotScreenX, pivotScreenY) {
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

  function getZoom()   { return _zoom; }
  function resetZoom() { _zoom = 1.0; centerImage(); return _zoom; }
  function zoomIn()    { return setZoom(_zoom * 1.2); }
  function zoomOut()   { return setZoom(_zoom / 1.2); }
  function setMode(m)  {
    if (m !== _mode) _justAdded = false;
    _mode = m; area.dataset.mode = m; area.style.cursor = m === 'add' ? 'crosshair' : '';
  }
  function getMode()   { return _mode; }

  function setShapes(shapes, labelColors) {
    _shapes = shapes || [];
    _labelColors = labelColors || {};
    _selectedIdx = -1;
    _justAdded = false;
    renderAnnotations();
  }
  function setLabelColors(lc) { _labelColors = lc; renderAnnotations(); }
  function setActiveLabel(label) { _activeLabel = label || null; }
  function setBehaviorSettings(settings) { _behaviorSettings = { ...(settings || {}) }; }
  function getSelectedIdx()   { return _selectedIdx; }
  function setSelectedIdx(i)  {
    if (i < 0 || i !== _selectedIdx) _justAdded = false;
    _selectedIdx = i; renderAnnotations();
  }
  function setJustAdded(flag) { _justAdded = !!flag; }

  function screenToImage(sx, sy) {
    const rect = area.getBoundingClientRect();
    return { x: (sx - rect.left - _offsetX) / _zoom, y: (sy - rect.top - _offsetY) / _zoom };
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#','');
    return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${alpha})`;
  }
  function getColor(label) { return _labelColors[label] || '#2563eb'; }
  function rootStyle() { return getComputedStyle(document.documentElement); }
  function cssNumber(name, fallback) {
    const n = Number.parseFloat(rootStyle().getPropertyValue(name));
    return Number.isFinite(n) ? n : fallback;
  }
  function showAnnotations() { return document.documentElement.dataset.showAnnotations !== 'false'; }
  function showLabels() { return document.documentElement.dataset.showLabels === 'true'; }

  function rectFromPoints(pts) {
    if (!pts || pts.length < 2) return null;
    const x1 = Math.min(pts[0][0], pts[1][0]), y1 = Math.min(pts[0][1], pts[1][1]);
    const x2 = Math.max(pts[0][0], pts[1][0]), y2 = Math.max(pts[0][1], pts[1][1]);
    return { x1, y1, x2, y2, w: x2-x1, h: y2-y1 };
  }

  function renderAnnotations() {
    ensureSvgLayers();
    updateCrosshairScale();
    while (_annotationLayer.firstChild) _annotationLayer.removeChild(_annotationLayer.firstChild);
    if (!showAnnotations()) return;
    const fillOpacity = cssNumber('--annot-fill-opacity', 0.2);
    const strokeWidth = cssNumber('--annot-stroke-width', 1.5);
    const handleRadius = cssNumber('--handle-size', 8);
    const shouldShowLabels = showLabels();
    for (let i = 0; i < _shapes.length; i++) {
      const shape = _shapes[i];
      if (shape.shape_type !== 'rectangle') continue;
      const r = rectFromPoints(shape.points);
      if (!r) continue;
      const color = getColor(shape.label);
      const isSelected = (i === _selectedIdx);
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');

      const fill = document.createElementNS('http://www.w3.org/2000/svg','rect');
      fill.setAttribute('x', r.x1); fill.setAttribute('y', r.y1);
      fill.setAttribute('width', r.w); fill.setAttribute('height', r.h);
      fill.setAttribute('fill', hexToRgba(color, fillOpacity));
      fill.setAttribute('data-idx', i);
      g.appendChild(fill);

      const stroke = document.createElementNS('http://www.w3.org/2000/svg','rect');
      stroke.setAttribute('x', r.x1); stroke.setAttribute('y', r.y1);
      stroke.setAttribute('width', r.w); stroke.setAttribute('height', r.h);
      stroke.setAttribute('fill', 'none');
      stroke.setAttribute('stroke', color);
      stroke.setAttribute('stroke-width', (isSelected ? strokeWidth + 1 : strokeWidth) / _zoom);
      stroke.setAttribute('data-idx', i);
      g.appendChild(stroke);

      if (shouldShowLabels) {
        const labelText = document.createElementNS('http://www.w3.org/2000/svg','text');
        labelText.setAttribute('x', r.x1);
        labelText.setAttribute('y', Math.max(12 / _zoom, r.y1 - 4 / _zoom));
        labelText.setAttribute('fill', color);
        labelText.setAttribute('stroke', 'rgba(0,0,0,.65)');
        labelText.setAttribute('stroke-width', 3 / _zoom);
        labelText.setAttribute('paint-order', 'stroke');
        labelText.setAttribute('font-size', 12 / _zoom);
        labelText.setAttribute('font-weight', '700');
        labelText.textContent = shape.label || '';
        g.appendChild(labelText);
      }

      if (isSelected) {
        const handles = getHandlePositions(r);
        for (const [hName, hx, hy] of handles) {
          const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
          c.setAttribute('cx', hx); c.setAttribute('cy', hy);
          c.setAttribute('r', handleRadius / _zoom);
          c.setAttribute('fill', '#fff');
          c.setAttribute('stroke', color);
          c.setAttribute('stroke-width', 1.5 / _zoom);
          const cursor = getCursorForHandle(hName);
          c.setAttribute('data-handle', hName);
          c.setAttribute('data-cursor', cursor);
          c.setAttribute('cursor', cursor);
          c.setAttribute('data-idx', i);
          g.appendChild(c);
        }
      }
      g.setAttribute('data-idx', i);
      _annotationLayer.appendChild(g);
    }

    if (_drag && _drag.type === 'draw' && _drag.curImgX !== undefined) {
      const dx = _drag.startImgX, dy = _drag.startImgY;
      const ex = _drag.curImgX,  ey = _drag.curImgY;
      const preview = document.createElementNS('http://www.w3.org/2000/svg','rect');
      preview.setAttribute('x', Math.min(dx,ex)); preview.setAttribute('y', Math.min(dy,ey));
      preview.setAttribute('width', Math.abs(ex-dx)); preview.setAttribute('height', Math.abs(ey-dy));
      preview.setAttribute('fill', 'rgba(37,99,235,0.12)');
      preview.setAttribute('stroke', '#3b82f6');
      preview.setAttribute('stroke-width', 2 / _zoom);
      preview.setAttribute('stroke-dasharray', `${6/_zoom} ${3/_zoom}`);
      _annotationLayer.appendChild(preview);
    }
  }

  function initSvgLayers() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    _annotationLayer = document.createElementNS('http://www.w3.org/2000/svg','g');
    _annotationLayer.setAttribute('data-layer', 'annotations');

    _crosshairLayer = document.createElementNS('http://www.w3.org/2000/svg','g');
    _crosshairLayer.setAttribute('data-layer', 'crosshair');
    _crosshairLayer.setAttribute('hidden', '');

    _crosshairH = document.createElementNS('http://www.w3.org/2000/svg','line');
    _crosshairH.setAttribute('class', 'crosshair-h');
    _crosshairV = document.createElementNS('http://www.w3.org/2000/svg','line');
    _crosshairV.setAttribute('class', 'crosshair-v');

    _crosshairLayer.appendChild(_crosshairH);
    _crosshairLayer.appendChild(_crosshairV);
    svg.appendChild(_annotationLayer);
    svg.appendChild(_crosshairLayer);
    updateCrosshairScale();
  }

  function ensureSvgLayers() {
    if (!_annotationLayer || !_crosshairLayer || !_crosshairH || !_crosshairV) initSvgLayers();
  }

  function updateCrosshairScale() {
    if (!svg) return;
    const crosshairWidth = cssNumber('--crosshair-width', 1.25);
    svg.style.setProperty('--crosshair-stroke-width', `${crosshairWidth / _zoom}`);
    svg.style.setProperty('--crosshair-dasharray', `${5 / _zoom} ${4 / _zoom}`);
  }

  function updateCrosshair(clientX, clientY) {
    ensureSvgLayers();
    if (!_imgW || !_imgH) {
      hideCrosshair();
      return;
    }

    const { x, y } = screenToImage(clientX, clientY);
    if (x < 0 || x > _imgW || y < 0 || y > _imgH) {
      hideCrosshair();
      return;
    }

    _crosshairH.setAttribute('x1', 0);
    _crosshairH.setAttribute('y1', y);
    _crosshairH.setAttribute('x2', _imgW);
    _crosshairH.setAttribute('y2', y);
    _crosshairV.setAttribute('x1', x);
    _crosshairV.setAttribute('y1', 0);
    _crosshairV.setAttribute('x2', x);
    _crosshairV.setAttribute('y2', _imgH);
    updateCrosshairScale();
    _crosshairLayer.removeAttribute('hidden');
  }

  function hideCrosshair() {
    if (_crosshairLayer) _crosshairLayer.setAttribute('hidden', '');
  }

  function getHandlePositions(r) {
    const mx = (r.x1 + r.x2) / 2, my = (r.y1 + r.y2) / 2;
    return [
      ['nw', r.x1, r.y1], ['n', mx, r.y1], ['ne', r.x2, r.y1],
      ['w', r.x1, my],    ['e', r.x2, my],
      ['sw', r.x1, r.y2], ['s', mx, r.y2],  ['se', r.x2, r.y2],
    ];
  }

  function hitTestHandle(imgX, imgY) {
    if (_selectedIdx < 0) return null;
    const shape = _shapes[_selectedIdx];
    if (!shape) return null;
    const r = rectFromPoints(shape.points);
    if (!r) return null;
    const RADIUS = Math.max(HANDLE_HIT_RADIUS_SCREEN, cssNumber('--handle-size', 8) + 4) / _zoom;
    for (const [hName, hx, hy] of getHandlePositions(r)) {
      const dx = imgX - hx, dy = imgY - hy;
      if (Math.sqrt(dx*dx + dy*dy) <= RADIUS) return hName;
    }
    return null;
  }

  function getCursorForHandle(handle) {
    if (handle === 'nw' || handle === 'se') return 'nwse-resize';
    if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
    if (handle === 'n' || handle === 's') return 'ns-resize';
    if (handle === 'w' || handle === 'e') return 'ew-resize';
    return 'default';
  }

  function hitTestShape(imgX, imgY) {
    for (let i = _shapes.length - 1; i >= 0; i--) {
      const shape = _shapes[i];
      if (shape.shape_type !== 'rectangle') continue;
      const r = rectFromPoints(shape.points);
      if (!r) continue;
      if (imgX >= r.x1 && imgX <= r.x2 && imgY >= r.y1 && imgY <= r.y2) return i;
    }
    return -1;
  }

  const _pointers = new Map();
  let _pinchDist0 = null, _pinchZoom0 = null;

  function onPointerDown(e) {
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
        if (hitIdx !== _selectedIdx) _justAdded = false;
        _selectedIdx = hitIdx;
        renderAnnotations();
        if (_onShapesChanged) _onShapesChanged('select', _selectedIdx);
        return;
      }
      _selectedIdx = -1;
      _justAdded = false;
      _drag = { type: 'pan', startX: e.clientX, startY: e.clientY, origOX: _offsetX, origOY: _offsetY };
      renderAnnotations();
      if (_onShapesChanged) _onShapesChanged('select', -1);
    } else if (_mode === 'add') {
      _drag = { type: 'draw', startImgX: ix, startImgY: iy, curImgX: ix, curImgY: iy };
    }
  }

  function behaviorBool(key) { return _behaviorSettings && _behaviorSettings[key] === true; }
  function clipEnabled() { return !_behaviorSettings || _behaviorSettings.autoClipToBounds !== false; }
  function clampPoint(x, y) {
    return clipEnabled() ? { x: clampImgX(x), y: clampImgY(y) } : { x, y };
  }
  function snapThreshold() { return 8 / Math.max(_zoom, 0.1); }
  function snapCandidates(label, excludeIdx = -1) {
    const candidates = { xs: [], ys: [] };
    const useSame = behaviorBool('snapSameLabel');
    const useOther = behaviorBool('snapOtherLabel');
    if (!useSame && !useOther) return candidates;
    for (let i = 0; i < _shapes.length; i++) {
      if (i === excludeIdx) continue;
      const shape = _shapes[i];
      if (!shape || shape.shape_type !== 'rectangle') continue;
      const sameLabel = shape.label === label;
      if ((sameLabel && !useSame) || (!sameLabel && !useOther)) continue;
      const r = rectFromPoints(shape.points);
      if (!r) continue;
      const mx = (r.x1 + r.x2) / 2;
      const my = (r.y1 + r.y2) / 2;
      candidates.xs.push(r.x1, mx, r.x2);
      candidates.ys.push(r.y1, my, r.y2);
    }
    return candidates;
  }
  function nearestSnap(value, candidates, threshold) {
    let best = value;
    let bestDist = threshold;
    for (const candidate of candidates) {
      const dist = Math.abs(value - candidate);
      if (dist <= bestDist) { best = candidate; bestDist = dist; }
    }
    return best;
  }
  function applySnapPoint(x, y, label, excludeIdx = -1) {
    const candidates = snapCandidates(label, excludeIdx);
    const threshold = snapThreshold();
    return {
      x: nearestSnap(x, candidates.xs, threshold),
      y: nearestSnap(y, candidates.ys, threshold),
    };
  }
  function onPointerMove(e) {
    if (e.pointerType === 'touch') { hideCrosshair(); return; }
    updateCrosshair(e.clientX, e.clientY);
    if (!_drag) return;
    e.preventDefault();
    const { x: ix, y: iy } = screenToImage(e.clientX, e.clientY);
    if (_drag.type === 'pan') {
      _offsetX = _drag.origOX + (e.clientX - _drag.startX);
      _offsetY = _drag.origOY + (e.clientY - _drag.startY);
      applyTransform();
    } else if (_drag.type === 'draw') {
      const p = clampPoint(ix, iy);
      const snapped = applySnapPoint(p.x, p.y, _activeLabel);
      _drag.curImgX = snapped.x; _drag.curImgY = snapped.y;
      renderAnnotations();
    } else if (_drag.type === 'resize') {
      applyResize(_drag, ix, iy); renderAnnotations();
    }
  }

  function onPointerLeave(e) {
    if (e.pointerType === 'touch') return;
    hideCrosshair();
  }

  function onPointerCancel(e) {
    hideCrosshair();
    onPointerUp(e);
  }

  function onPointerUp(e) {
    if (e.pointerType === 'touch') return;
    if (!_drag) return;
    if (_drag.type === 'draw') {
      const endPoint = clampPoint(_drag.curImgX ?? _drag.startImgX, _drag.curImgY ?? _drag.startImgY);
      const ix = endPoint.x;
      const iy = endPoint.y;
      if (Math.abs(ix - _drag.startImgX) > 0 && Math.abs(iy - _drag.startImgY) > 0) {
        if (_onShapesChanged) _onShapesChanged('addShape', { x1: _drag.startImgX, y1: _drag.startImgY, x2: ix, y2: iy });
      }
    } else if (_drag.type === 'resize') {
      if (_onShapesChanged) _onShapesChanged('shapeUpdated', _drag.idx);
    }
    _drag = null; renderAnnotations();
  }

  let _touchPanStart = null, _pinchActive = false;

  function onTouchStart(e) {
    e.preventDefault();
    const touches = e.touches;
    if (touches.length === 2) {
      _pinchActive = true;
      _pinchDist0 = pinchDist(touches); _pinchZoom0 = _zoom;
      _touchPanStart = null; _drag = null; return;
    }
    if (touches.length === 1) {
      const t = touches[0];
      const isPencil = t.touchType === 'stylus' || (e.changedTouches[0] && e.changedTouches[0].touchType === 'stylus');
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
            if (hitIdx !== _selectedIdx) _justAdded = false;
            _selectedIdx = hitIdx;
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

  function onTouchMove(e) {
    e.preventDefault();
    const touches = e.touches;
    if (_pinchActive && touches.length === 2) {
      const d = pinchDist(touches);
      if (_pinchDist0 > 0) {
        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        setZoom(_pinchZoom0 * d / _pinchDist0, midX, midY);
        if (_onShapesChanged) _onShapesChanged('zoom', null);
      }
      return;
    }
    if (touches.length === 1) {
      const t = touches[0];
      const isPencil = t.touchType === 'stylus';
      const { x: ix, y: iy } = screenToImage(t.clientX, t.clientY);
      if (isPencil && _drag) {
        if (_drag.type === 'draw') {
          const p = clampPoint(ix, iy);
          const snapped = applySnapPoint(p.x, p.y, _activeLabel);
          _drag.curImgX = snapped.x; _drag.curImgY = snapped.y; renderAnnotations();
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

  function onTouchEnd(e) {
    if (e.touches.length < 2) _pinchActive = false;
    if (_drag) {
      const t = e.changedTouches[0];
      if (!t) { _drag = null; return; }
      if (t.touchType === 'stylus') {
        const { x: ix, y: iy } = screenToImage(t.clientX, t.clientY);
        if (_drag.type === 'draw') {
          const endPoint = clampPoint(ix, iy);
          const ex = endPoint.x, ey = endPoint.y;
          if (Math.abs(ex - _drag.startImgX) > 0 && Math.abs(ey - _drag.startImgY) > 0) {
            if (_onShapesChanged) _onShapesChanged('addShape', { x1: _drag.startImgX, y1: _drag.startImgY, x2: ex, y2: ey });
          }
        } else if (_drag.type === 'resize') {
          if (_onShapesChanged) _onShapesChanged('shapeUpdated', _drag.idx);
        }
        _drag = null; renderAnnotations(); return;
      }
    }
    _touchPanStart = null; _drag = null;
  }

  function pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function applyResize(drag, ix, iy) {
    const op = drag.origPts;
    let x1 = Math.min(op[0][0], op[1][0]), y1 = Math.min(op[0][1], op[1][1]);
    let x2 = Math.max(op[0][0], op[1][0]), y2 = Math.max(op[0][1], op[1][1]);
    const h = drag.handle;
    const resizedPoint = applySnapPoint(clampImgX(ix), clampImgY(iy), _shapes[drag.idx]?.label, drag.idx);
    const rix = resizedPoint.x, riy = resizedPoint.y;
    if (h.includes('n')) y1 = Math.min(riy, y2 - 2);
    if (h.includes('s')) y2 = Math.max(riy, y1 + 2);
    if (h.includes('w')) x1 = Math.min(rix, x2 - 2);
    if (h.includes('e')) x2 = Math.max(rix, x1 + 2);
    x1 = Math.max(0, x1); y1 = Math.max(0, y1);
    x2 = Math.min(_imgW, x2); y2 = Math.min(_imgH, y2);
    _shapes[drag.idx].points = [[x1, y1],[x2, y2]];
  }

  function clampImgX(x) { return Math.max(0, Math.min(_imgW, x)); }
  function clampImgY(y) { return Math.max(0, Math.min(_imgH, y)); }

  function onShapesChanged(cb) { _onShapesChanged = cb; }
  function getImageSize() { return { w: _imgW, h: _imgH }; }

  return { init, loadImage, fitToView, resetZoom, centerImage, setZoom, getZoom, zoomIn, zoomOut, setMode, getMode, setShapes, setLabelColors, setActiveLabel, setBehaviorSettings, setSelectedIdx, getSelectedIdx, setJustAdded, renderAnnotations, onShapesChanged, getImageSize };
})();
