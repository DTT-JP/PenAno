/**
 * tasks/types/app.ts
 * app.js / canvas.js のアプリケーションロジックに関する型定義
 */

import type { LabelMeShape } from './labelme';

// ─── Mode ────────────────────────────────────────────────────────────────────

/**
 * アノテーション操作モード。
 * canvas.js の _mode / setMode に対応。
 * HTML では data-mode 属性として設定される。
 */
export type AppMode = 'select' | 'add';

// ─── Drag State ──────────────────────────────────────────────────────────────

/**
 * ドラッグ操作なし（初期状態）。
 */
export type NoDrag = null;

/**
 * 画像パン（スクロール）操作中。
 * canvas.js onPointerDown の select モード、ヒットなし時に生成。
 */
export interface PanDrag {
  type: 'pan';
  /** ポインタ開始位置（スクリーン座標 px）*/
  startX: number;
  startY: number;
  /** ドラッグ開始時の canvas オフセット（px）*/
  origOX: number;
  origOY: number;
}

/**
 * 矩形描画（追加モード）操作中。
 * canvas.js onPointerDown の add モード時に生成。
 */
export interface DrawDrag {
  type: 'draw';
  /** 描画開始点（画像座標 px）*/
  startImgX: number;
  startImgY: number;
  /** 現在のポインタ位置（画像座標 px）。移動前は startImgX/Y と同値。*/
  curImgX: number;
  curImgY: number;
}

/**
 * 既存 shape の移動操作中（select モード、面タップ）。
 */
export interface MoveDrag {
  type: 'move';
  /** 操作対象の shapes[] インデックス */
  idx: number;
  /** ドラッグ開始点（画像座標 px）*/
  startImgX: number;
  startImgY: number;
  /** ドラッグ開始時の points のディープコピー */
  origPts: LabelMeShape['points'];
}

/**
 * リサイズハンドルの名前。
 * 8方向 + 将来の拡張を考慮した文字列リテラル型。
 *
 * 配置:
 *   nw ─ n ─ ne
 *   w  ─   ─ e
 *   sw ─ s ─ se
 */
export type HandleName = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

/**
 * 既存 shape のリサイズ操作中（select モード、ハンドルドラッグ）。
 */
export interface ResizeDrag {
  type: 'resize';
  /** 操作対象の shapes[] インデックス */
  idx: number;
  /** 掴んだハンドルの名前 */
  handle: HandleName;
  /** ドラッグ開始点（画像座標 px）*/
  startImgX: number;
  startImgY: number;
  /** ドラッグ開始時の points のディープコピー */
  origPts: LabelMeShape['points'];
}

/**
 * canvas.js 内部の _drag 変数の型。
 * null はドラッグ操作なし。
 */
export type DragState = NoDrag | PanDrag | DrawDrag | MoveDrag | ResizeDrag;

// ─── Canvas Callback Events ───────────────────────────────────────────────────

/**
 * canvas.js から app.js へ通知される操作イベントの種別。
 * CanvasManager.onShapesChanged(cb) で登録したコールバックの第 1 引数。
 */
export type ShapesChangedEventType =
  | 'select'       // オブジェクト選択（_selectedIdx が更新された）
  | 'addShape'     // 矩形描画完了（dataには描画座標が入る）
  | 'shapeUpdated' // 移動 or リサイズ完了（data は shapes[] のインデックス）
  | 'zoom';        // ピンチズーム操作（data は null）

/**
 * 'addShape' イベント時の data オブジェクト。
 * app.js の handleShapesChanged > case 'addShape' に対応。
 */
export interface AddShapeEventData {
  /** 描画開始点（画像座標 px）*/
  x1: number;
  y1: number;
  /** 描画終了点（画像座標 px）*/
  x2: number;
  y2: number;
}

/**
 * CanvasManager.onShapesChanged に登録するコールバックの型。
 *
 * @param eventType イベント種別
 * @param data
 *   - 'select'       → 選択インデックス（number）または -1（選択解除）
 *   - 'addShape'     → AddShapeEventData
 *   - 'shapeUpdated' → 更新した shapes[] インデックス（number）
 *   - 'zoom'         → null
 */
export type ShapesChangedCallback = (
  eventType: ShapesChangedEventType,
  data: number | AddShapeEventData | null
) => void;

// ─── Settings / UI ───────────────────────────────────────────────────────────

/**
 * 塗りつぶし濃度の選択肢。
 * index.html の #segmentFill data-val に対応。
 */
export type FillOpacity = 0.08 | 0.20 | 0.40;

/**
 * ハンドルサイズの選択肢（画像座標系 px）。
 * index.html の #segmentHandle data-val に対応。
 * canvas.js の r 属性 / RADIUS に使用。
 */
export type HandleSize = 4 | 6 | 9;

/**
 * 最小矩形サイズの選択肢（画像座標系 px）。
 * index.html の #segmentMinSize data-val に対応。
 * onPointerUp の描画完了判定に使用。
 */
export type MinShapeSize = 2 | 4 | 8 | 16;

// ─── App Callbacks (settings.js → app.js 境界) ───────────────────────────────

/**
 * app.js が settings.js の initSettings() へ渡すコールバック群。
 * settings.js はこれを通じてのみ app.js の状態にアクセスする。
 */
export interface AppCallbacks {
  /** 現在のセッション ID を返す。セッション未開始なら null。*/
  getCurrentSessionId: () => string | null;

  /** 現在のラベルカラーマップを返す。*/
  getLabelColors: () => import('./storage').LabelColors;

  /**
   * ラベルカラーを storage から再読み込みし、
   * CanvasManager と labelList の表示を更新する。
   */
  reloadLabelColors: () => void;
}

// ─── Image Coordinate Helpers ─────────────────────────────────────────────────

/**
 * 画像座標系の点。
 * canvas.js の screenToImage の戻り値に対応。
 */
export interface ImagePoint {
  x: number;
  y: number;
}

/**
 * 矩形の正規化済み表現（x1 ≤ x2, y1 ≤ y2 を保証）。
 * canvas.js の rectFromPoints の戻り値に対応。
 */
export interface NormalizedRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** x2 - x1 */
  w: number;
  /** y2 - y1 */
  h: number;
}