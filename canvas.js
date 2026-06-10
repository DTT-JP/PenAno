/**
 * canvas.js – 画像表示・アノテーション描画・ペン/タッチ操作
 */
const CanvasManager = (() => {
  let canvas, svg, wrapper, area;
  let _imgW = 0, _imgH = 0;
  let _zoom = 1.0;       // 1.0 = 100%
  let _offsetX = 0, _offsetY = 0;
  let _mode = 'select';  // 'select' | 'add'
  let _shapes = [];
  let _selectedIdx = -1;
  let _labelColors = {};

  // drag state
  let _drag = null;
  /*
    _drag types:
      { type: 'pan',   startX, startY, origOX, origOY }
      { type: 'draw',  startImgX, startImgY }   (add mode)
      { type: 'move',  idx, startImgX, startImgY, origPts }
      { type: 'resize', idx, handle, startImgX, startImgY, origPts }
  */

  let _onShapesChanged = null;  // callback

  // ─── Init ───────────────────────────────────────────────────
  function init(canvasEl, svgEl, wrapperEl, areaEl) {
    canvas  = canvasEl;
    svg     = svgEl;
    wrapper = wrapperEl;
    area    = areaEl;

    // touch & pointer events on the area
    area.addEventListener('pointerdown', onPointerDown, { passive: false });
    area.addEventListener('pointermove', onPointerMove, { passive: false });
    area.addEventListener('pointerup',   onPointerUp,   { passive: false });
    area.addEventListener('pointercancel', onPointerUp, { passive: false });

    // Pinch-to-zoom (touch only) via separate touch events
    area.addEventListener('touchstart', onTouchStart, { passive: false });
    area.addEventListener('touchmove',  onTouchMove,  { passive: false });
    area.addEventListener('touchend',   onTouchEnd,   { passive: false });
  }

  // ─── Load image ─────────────────────────────────────────────
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        _imgW = img.naturalWidth;
        _imgH = img.naturalHeight;
        canvas.width  = _imgW;
        canvas.height = _imgH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        _selectedIdx = -1;
        fitToView();
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // ─── Fit to view ─────────────────────────────────────────────
  function fitToView() {
    const aW = area.clientWidth;
    const aH = area.clientHeight;
    const PADDING = 24;
    const scaleX = (aW - PADDING * 2) / _imgW;
    const scaleY = (aH - PADDING * 2) / _imgH;
    _zoom = Math.min(scaleX, scaleY, 1.0);
    centerImage();
  }

  function centerImage() {
    const aW = area.clientWidth;
    const aH = area.clientHeight;
    const dW = _imgW * _zoom;
    const dH = _imgH * _zoom;
    _offsetX = (aW - dW) / 2;
    _offsetY = (aH - dH) / 2;
    applyTransform();
  }

  function applyTransform() {
    // Clamp offset so image doesn't go too far off-screen (allow almost infinite panning)
    const minOX = -999999;
    const minOY = -999999;
    const maxOX = 999999;
    const maxOY = 999999;
    _offsetX = Math.max(minOX, Math.min(maxOX, _offsetX));
    _offsetY = Math.max(minOY, Math.min(maxOY, _offsetY));

    wrapper.style.width  = _imgW + 'px';
    wrapper.style.height = _imgH + 'px';
    wrapper.style.transform = `translate(${_offsetX}px, ${_offsetY}px) scale(${_zoom})`;
    wrapper.style.transformOrigin = '0 0';

    svg.setAttribute('viewBox', `0 0 ${_imgW} ${_imgH}`);
  }

  // ─── Zoom ────────────────────────────────────────────────────
  function setZoom(z, pivotScreenX, pivotScreenY) {
    const oldZ = _zoom;
    _zoom = Math.max(0.1, Math.min(8, z));
    let px, py;
    if (pivotScreenX !== undefined) {
      // Zoom around pivot point
      px = pivotScreenX - area.getBoundingClientRect().left;
      py = pivotScreenY - area.getBoundingClientRect().top;
    } else {
      // Default: Zoom around center of the area
      px = area.clientWidth / 2;
      py = area.clientHeight / 2;
    }
    _offsetX = px - (px - _offsetX) * (_zoom / oldZ);
    _offsetY = py - (py - _offsetY) * (_zoom / oldZ);
    applyTransform();
    return _zoom;
  }

  function getZoom() { return _zoom; }

  function resetZoom() {
    _zoom = 1.0;
    centerImage();
    return _zoom;
  }

  function zoomIn()  { return setZoom(_zoom * 1.2); }
  function zoomOut() { return setZoom(_zoom / 1.2); }

  // ─── Mode ────────────────────────────────────────────────────
  function setMode(m) {
    _mode = m;
    area.dataset.mode = m;
    if (m === 'select') {
      area.style.cursor = '';
    } else {
      area.style.cursor = 'crosshair';
    }
  }

  function getMode() { return _mode; }

  // ─── Shapes ─────────────────────────────────────────────────
  function setShapes(shapes, labelColors) {
    _shapes = shapes || [];
    _labelColors = labelColors || {};
    _selectedIdx = -1;
    renderAnnotations();
  }

  function setLabelColors(lc) {
    _labelColors = lc;
    renderAnnotations();
  }

  function getSelectedIdx() { return _selectedIdx; }
  function setSelectedIdx(i) {
    _selectedIdx = i;
    renderAnnotations();
  }

  // ─── Convert coords ─────────────────────────────────────────
  function screenToImage(sx, sy) {
    const rect = area.getBoundingClientRect();
    const ax = sx - rect.left;
    const ay = sy - rect.top;
    const ix = (ax - _offsetX) / _zoom;
    const iy = (ay - _offsetY) / _zoom;
    return { x: ix, y: iy };
  }

  // ─── Render Annotations ─────────────────────────────────────
  function hexToRgba(hex, alpha) {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16);
    const g = parseInt(h.slice(2,4),16);
    const b = parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function getColor(label) {
    return _labelColors[label] || '#e94560';
  }

  function rectFromPoints(pts) {
    if (!pts || pts.length < 2) return null;
    const x1 = Math.min(pts[0][0], pts[1][0]);
    const y1 = Math.min(pts[0][1], pts[1][1]);
    const x2 = Math.max(pts[0][0], pts[1][0]);
    const y2 = Math.max(pts[0][1], pts[1][1]);
    return { x1, y1, x2, y2, w: x2-x1, h: y2-y1 };
  }

  function renderAnnotations() {
    // Clear SVG
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    for (let i = 0; i < _shapes.length; i++) {
      const shape = _shapes[i];
      if (shape.shape_type !== 'rectangle') continue;
      const r = rectFromPoints(shape.points);
      if (!r) continue;

      const color = getColor(shape.label);
      const isSelected = (i === _selectedIdx);

      const g = document.createElementNS('http://www.w3.org/2000/svg','g');

      // Fill
      const fill = document.createElementNS('http://www.w3.org/2000/svg','rect');
      fill.setAttribute('x', r.x1); fill.setAttribute('y', r.y1);
      fill.setAttribute('width', r.w); fill.setAttribute('height', r.h);
      fill.setAttribute('fill', hexToRgba(color, 0.25));
      fill.setAttribute('data-idx', i);
      g.appendChild(fill);

      // Stroke
      const stroke = document.createElementNS('http://www.w3.org/2000/svg','rect');
      stroke.setAttribute('x', r.x1); stroke.setAttribute('y', r.y1);
      stroke.setAttribute('width', r.w); stroke.setAttribute('height', r.h);
      stroke.setAttribute('fill', 'none');
      stroke.setAttribute('stroke', color);
      stroke.setAttribute('stroke-width', isSelected ? 2.5 / _zoom : 1.5 / _zoom);
      stroke.setAttribute('data-idx', i);
      g.appendChild(stroke);

      // Label text
      // (Removed as per user request)


      if (isSelected) {
        // Handle circles at corners and midpoints
        const handles = getHandlePositions(r);
        for (const [hName, hx, hy] of handles) {
          const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
          c.setAttribute('cx', hx); c.setAttribute('cy', hy);
          c.setAttribute('r', 6 / _zoom);
          c.setAttribute('fill', '#fff');
          c.setAttribute('stroke', color);
          c.setAttribute('stroke-width', 1.5 / _zoom);
          c.setAttribute('data-handle', hName);
          c.setAttribute('data-idx', i);
          g.appendChild(c);
        }
      }

      g.setAttribute('data-idx', i);
      svg.appendChild(g);
    }

    // Draw box (add mode preview)
    if (_drag && _drag.type === 'draw' && _drag.curImgX !== undefined) {
      const dx = _drag.startImgX, dy = _drag.startImgY;
      const ex = _drag.curImgX,  ey = _drag.curImgY;
      const x1 = Math.min(dx,ex), y1 = Math.min(dy,ey);
      const w  = Math.abs(ex-dx), h  = Math.abs(ey-dy);
      const preview = document.createElementNS('http://www.w3.org/2000/svg','rect');
      preview.setAttribute('x', x1); preview.setAttribute('y', y1);
      preview.setAttribute('width', w); preview.setAttribute('height', h);
      preview.setAttribute('fill', 'rgba(79,143,255,0.15)');
      preview.setAttribute('stroke', '#4f8fff');
      preview.setAttribute('stroke-width', 2 / _zoom);
      preview.setAttribute('stroke-dasharray', `${6/_zoom} ${3/_zoom}`);
      svg.appendChild(preview);
    }
  }

  // 8 handles: corners (nw,ne,sw,se) + midpoints (n,s,e,w)
  function getHandlePositions(r) {
    const mx = (r.x1 + r.x2) / 2, my = (r.y1 + r.y2) / 2;
    return [
      ['nw', r.x1, r.y1], ['n', mx, r.y1], ['ne', r.x2, r.y1],
      ['w',  r.x1, my  ], ['e', r.x2, my  ],
      ['sw', r.x1, r.y2], ['s', mx, r.y2  ], ['se', r.x2, r.y2],
    ];
  }

  // ─── Hit testing ─────────────────────────────────────────────
  function hitTestHandle(imgX, imgY) {
    if (_selectedIdx < 0) return null;
    const shape = _shapes[_selectedIdx];
    if (!shape) return null;
    const r = rectFromPoints(shape.points);
    if (!r) return null;
    const handles = getHandlePositions(r);
    const RADIUS = 10 / _zoom;
    for (const [hName, hx, hy] of handles) {
      const dx = imgX - hx, dy = imgY - hy;
      if (Math.sqrt(dx*dx + dy*dy) <= RADIUS) return hName;
    }
    return null;
  }

  function hitTestShape(imgX, imgY) {
    // Return index of topmost shape under point (reverse order)
    for (let i = _shapes.length - 1; i >= 0; i--) {
      const shape = _shapes[i];
      if (shape.shape_type !== 'rectangle') continue;
      const r = rectFromPoints(shape.points);
      if (!r) continue;
      if (imgX >= r.x1 && imgX <= r.x2 && imgY >= r.y1 && imgY <= r.y2) return i;
    }
    return -1;
  }

  // ─── Pointer Events ──────────────────────────────────────────
  // Track active pointers for pinch
  const _pointers = new Map();
  let _pinchDist0 = null;
  let _pinchZoom0 = null;

  function onPointerDown(e) {
    if (e.pointerType === 'touch') return; // handled by touch events for pinch
    e.preventDefault();

    const { x: ix, y: iy } = screenToImage(e.clientX, e.clientY);

    if (_mode === 'select') {
      // Check handle first
      const handle = hitTestHandle(ix, iy);
      if (handle && _selectedIdx >= 0) {
        const shape = _shapes[_selectedIdx];
        _drag = { type: 'resize', idx: _selectedIdx, handle,
                  startImgX: ix, startImgY: iy,
                  origPts: JSON.parse(JSON.stringify(shape.points)) };
        return;
      }

      // Check shape body
      const hitIdx = hitTestShape(ix, iy);
      if (hitIdx >= 0) {
        _selectedIdx = hitIdx;
        const shape = _shapes[_selectedIdx];
        _drag = { type: 'move', idx: _selectedIdx,
                  startImgX: ix, startImgY: iy,
                  origPts: JSON.parse(JSON.stringify(shape.points)) };
        renderAnnotations();
        if (_onShapesChanged) _onShapesChanged('select', _selectedIdx);
        return;
      }

      // Pan
      _selectedIdx = -1;
      _drag = { type: 'pan', startX: e.clientX, startY: e.clientY, origOX: _offsetX, origOY: _offsetY };
      renderAnnotations();
      if (_onShapesChanged) _onShapesChanged('select', -1);

    } else if (_mode === 'add') {
      // Only Apple Pencil or mouse in add mode
      _drag = { type: 'draw', startImgX: ix, startImgY: iy, curImgX: ix, curImgY: iy };
    }
  }

  function onPointerMove(e) {
    if (e.pointerType === 'touch') return;
    if (!_drag) return;
    e.preventDefault();

    const { x: ix, y: iy } = screenToImage(e.clientX, e.clientY);

    if (_drag.type === 'pan') {
      _offsetX = _drag.origOX + (e.clientX - _drag.startX);
      _offsetY = _drag.origOY + (e.clientY - _drag.startY);
      applyTransform();
    } else if (_drag.type === 'draw') {
      _drag.curImgX = clampImgX(ix);
      _drag.curImgY = clampImgY(iy);
      renderAnnotations();
    } else if (_drag.type === 'move') {
      const dx = ix - _drag.startImgX;
      const dy = iy - _drag.startImgY;
      const op = _drag.origPts;
      const bw = Math.abs(op[1][0] - op[0][0]);
      const bh = Math.abs(op[1][1] - op[0][1]);
      let nx1 = clampImgX(op[0][0] + dx);
      let ny1 = clampImgY(op[0][1] + dy);
      // keep box within bounds
      nx1 = Math.max(0, Math.min(_imgW - bw, nx1));
      ny1 = Math.max(0, Math.min(_imgH - bh, ny1));
      _shapes[_drag.idx].points = [[nx1, ny1],[nx1 + bw, ny1 + bh]];
      renderAnnotations();
    } else if (_drag.type === 'resize') {
      applyResize(_drag, ix, iy);
      renderAnnotations();
    }
  }

  function onPointerUp(e) {
    if (e.pointerType === 'touch') return;
    if (!_drag) return;

    if (_drag.type === 'draw') {
      const ix = clampImgX(_drag.curImgX ?? _drag.startImgX);
      const iy = clampImgY(_drag.curImgY ?? _drag.startImgY);
      if (Math.abs(ix - _drag.startImgX) > 4 / _zoom &&
          Math.abs(iy - _drag.startImgY) > 4 / _zoom) {
        if (_onShapesChanged) {
          _onShapesChanged('addShape', {
            x1: _drag.startImgX, y1: _drag.startImgY,
            x2: ix, y2: iy
          });
        }
      }
    } else if (_drag.type === 'move' || _drag.type === 'resize') {
      if (_onShapesChanged) _onShapesChanged('shapeUpdated', _drag.idx);
    }

    _drag = null;
    renderAnnotations();
  }

  // ─── Touch events (finger pan/pinch, pencil draw) ───────────
  let _touchPanStart = null;
  let _pinchActive = false;

  function onTouchStart(e) {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 2) {
      _pinchActive = true;
      _pinchDist0 = pinchDist(touches);
      _pinchZoom0 = _zoom;
      _touchPanStart = null;
      _drag = null;
      return;
    }

    if (touches.length === 1) {
      const t = touches[0];
      // isPencil: stylus type
      const isPencil = t.touchType === 'stylus' || (e.changedTouches[0] && e.changedTouches[0].touchType === 'stylus');
      const { x: ix, y: iy } = screenToImage(t.clientX, t.clientY);

      if (isPencil) {
        if (_mode === 'select') {
          const handle = hitTestHandle(ix, iy);
          if (handle && _selectedIdx >= 0) {
            const shape = _shapes[_selectedIdx];
            _drag = { type: 'resize', idx: _selectedIdx, handle,
                      startImgX: ix, startImgY: iy,
                      origPts: JSON.parse(JSON.stringify(shape.points)) };
            return;
          }
          const hitIdx = hitTestShape(ix, iy);
          if (hitIdx >= 0) {
            _selectedIdx = hitIdx;
            const shape = _shapes[_selectedIdx];
            _drag = { type: 'move', idx: _selectedIdx,
                      startImgX: ix, startImgY: iy,
                      origPts: JSON.parse(JSON.stringify(shape.points)) };
            renderAnnotations();
            if (_onShapesChanged) _onShapesChanged('select', _selectedIdx);
            return;
          }
        } else if (_mode === 'add') {
          _drag = { type: 'draw', startImgX: ix, startImgY: iy, curImgX: ix, curImgY: iy };
          return;
        }
      }

      // Finger pan
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
          _drag.curImgX = clampImgX(ix);
          _drag.curImgY = clampImgY(iy);
          renderAnnotations();
        } else if (_drag.type === 'move') {
          const dx = ix - _drag.startImgX;
          const dy = iy - _drag.startImgY;
          const op = _drag.origPts;
          const bw = Math.abs(op[1][0] - op[0][0]);
          const bh = Math.abs(op[1][1] - op[0][1]);
          let nx1 = Math.max(0, Math.min(_imgW - bw, op[0][0] + dx));
          let ny1 = Math.max(0, Math.min(_imgH - bh, op[0][1] + dy));
          _shapes[_drag.idx].points = [[nx1, ny1],[nx1 + bw, ny1 + bh]];
          renderAnnotations();
        } else if (_drag.type === 'resize') {
          applyResize(_drag, ix, iy);
          renderAnnotations();
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
      const isPencil = t.touchType === 'stylus';

      if (isPencil) {
        const { x: ix, y: iy } = screenToImage(t.clientX, t.clientY);
        if (_drag.type === 'draw') {
          const ex = clampImgX(ix), ey = clampImgY(iy);
          if (Math.abs(ex - _drag.startImgX) > 4 / _zoom &&
              Math.abs(ey - _drag.startImgY) > 4 / _zoom) {
            if (_onShapesChanged) {
              _onShapesChanged('addShape', {
                x1: _drag.startImgX, y1: _drag.startImgY,
                x2: ex, y2: ey
              });
            }
          }
        } else if (_drag.type === 'move' || _drag.type === 'resize') {
          if (_onShapesChanged) _onShapesChanged('shapeUpdated', _drag.idx);
        }
        _drag = null;
        renderAnnotations();
        return;
      }
    }

    _touchPanStart = null;
    _drag = null;
  }

  function pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  // ─── Resize helper ───────────────────────────────────────────
  function applyResize(drag, ix, iy) {
    const op = drag.origPts;
    let x1 = Math.min(op[0][0], op[1][0]);
    let y1 = Math.min(op[0][1], op[1][1]);
    let x2 = Math.max(op[0][0], op[1][0]);
    let y2 = Math.max(op[0][1], op[1][1]);

    const h = drag.handle;
    const rix = clampImgX(ix), riy = clampImgY(iy);

    if (h.includes('n')) y1 = Math.min(riy, y2 - 2);
    if (h.includes('s')) y2 = Math.max(riy, y1 + 2);
    if (h.includes('w')) x1 = Math.min(rix, x2 - 2);
    if (h.includes('e')) x2 = Math.max(rix, x1 + 2);

    // Clamp to image bounds
    x1 = Math.max(0, x1); y1 = Math.max(0, y1);
    x2 = Math.min(_imgW, x2); y2 = Math.min(_imgH, y2);

    _shapes[drag.idx].points = [[x1, y1],[x2, y2]];
  }

  // ─── Clamp helpers ───────────────────────────────────────────
  function clampImgX(x) { return Math.max(0, Math.min(_imgW, x)); }
  function clampImgY(y) { return Math.max(0, Math.min(_imgH, y)); }

  // ─── Public ──────────────────────────────────────────────────
  function onShapesChanged(cb) { _onShapesChanged = cb; }
  function getImageSize() { return { w: _imgW, h: _imgH }; }

  return {
    init, loadImage, fitToView, resetZoom, centerImage,
    setZoom, getZoom, zoomIn, zoomOut,
    setMode, getMode,
    setShapes, setLabelColors, setSelectedIdx, getSelectedIdx,
    renderAnnotations, onShapesChanged, getImageSize
  };
})();