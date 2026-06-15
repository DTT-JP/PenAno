/**
 * tasks/types/labelme.ts
 * LabelMe JSON 形式に関する型定義
 *
 * 参考: data.js の makeRectShape / getShapes / ensureJson
 */

// ─── Shape ───────────────────────────────────────────────────────────────────

/**
 * 現在サポートしている shape_type。
 * data.js / canvas.js ともに 'rectangle' のみ処理しているが、
 * JSON 読み込み時に他の値が混在することがあるため列挙しておく。
 */
export type ShapeType = 'rectangle' | 'polygon' | 'line' | 'point' | 'linestrip' | 'circle';

/**
 * LabelMe の shapes[] 内の 1 エントリ。
 * rectangle の場合 points は [[x1,y1],[x2,y2]] の 2 点。
 */
export interface LabelMeShape {
  /** ラベル名（例: "car", "person"）*/
  label: string;

  /**
   * 座標リスト。rectangle の場合は対角 2 点。
   * [[x1, y1], [x2, y2]]
   * 各座標は画像ピクセル単位の浮動小数点数。
   */
  points: [number, number][];

  /** グループID（null が大半）*/
  group_id: number | null;

  /** shape の種類 */
  shape_type: ShapeType;

  /** 追加フラグ（未使用が多いが JSON 仕様上存在する）*/
  flags: Record<string, boolean>;

  // 以下は LabelMe 5.x 以降のオプション項目
  description?: string;
  mask?: null | string;
}

// ─── JSON ────────────────────────────────────────────────────────────────────

/**
 * .json ファイル 1 枚分のルートオブジェクト。
 * data.js の ensureJson が生成するデフォルト構造に準拠。
 */
export interface LabelMeJson {
  /** LabelMe バージョン文字列（例: "5.0.1"）*/
  version: string;

  /** ファイルレベルのフラグ */
  flags: Record<string, boolean>;

  /** アノテーション一覧 */
  shapes: LabelMeShape[];

  /** 対応する画像ファイルのパス（ファイル名のみの場合が多い）*/
  imagePath: string;

  /**
   * Base64 エンコードされた画像データ。
   * PenAno は imageURL を使うため、通常 null。
   */
  imageData: string | null;

  /** 画像の高さ（px）*/
  imageHeight: number;

  /** 画像の幅（px）*/
  imageWidth: number;
}

// ─── FileEntry ───────────────────────────────────────────────────────────────

/**
 * DataManager が管理する 1 画像ファイル分のエントリ。
 * data.js の _files[] の各要素に対応。
 */
export interface FileEntry {
  /** ファイル名（例: "photo.jpg"）*/
  name: string;

  /** blob: または object URL（canvas への描画に使用）*/
  imageURL: string;

  /**
   * 対応する LabelMe JSON。
   * JSON が存在しない（アノテーションなし）場合は null。
   * data.js の ensureJson により遅延初期化される。
   */
  json: LabelMeJson | null;

  /**
   * localStorage からロードした、または編集済みであることを示すフラグ。
   * ZIP 書き出し時の対象判定に使用。
   */
  modified: boolean;
}