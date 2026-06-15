/**
 * tasks/types/storage.ts
 * storage.js の localStorage スキームに関する型定義
 */

// ─── Session ─────────────────────────────────────────────────────────────────

/**
 * フォルダ/ZIP の種別。
 * storage.js の registerSession の第 1 引数に対応。
 */
export type SessionType = 'folder' | 'zip';

/**
 * セッション一覧（lme_sessions）の 1 エントリ。
 * storage.js の _getSessions / _saveSessions が扱う配列要素。
 */
export interface SessionRecord {
  /**
   * セッション固有 ID。
   * フォーマット: `<type>:<name>:count<N>:size<S>`
   * 例: "folder:my_dataset:count42:size10485760"
   * 同じフォルダ/ZIP を再度開いたとき同じ ID になり、データを引き継ぐ。
   */
  id: string;

  /** UI に表示するフォルダ名 or ZIP ファイル名 */
  displayName: string;

  /** 'folder' or 'zip' */
  type: SessionType;

  /** 登録日時（Unix ミリ秒）*/
  createdAt: number;
}

// ─── Label Colors ─────────────────────────────────────────────────────────────

/**
 * ラベル名 → CSS カラー文字列のマップ。
 * localStorage キー: `lme_<sessionId>:label_colors`
 * 値: JSON.stringify した Record<string, string>
 *
 * @example { "car": "#2563eb", "person": "#22c55e" }
 */
export type LabelColors = Record<string, string>;

// ─── localStorage キー構造（リファレンス用）────────────────────────────────
//
// PREFIX = "lme_"
//
// グローバルキー:
//   lme_sessions                          → SessionRecord[] (JSON)
//
// セッションスコープキー (lme_<sessionId>:):
//   lme_<id>:label_colors                 → LabelColors (JSON)
//   lme_<id>:confirmed                    → string[] (ファイル名リスト, JSON)
//   lme_<id>:json_<filename>              → LabelMeJson (JSON)
//
// レガシーキー（旧バージョン互換、migrateLegacy で移行済み後も残存）:
//   lme_json_<filename>                   → LabelMeJson (JSON)
//   lme_label_colors                      → LabelColors (JSON)

// ─── Storage API の戻り値型 ───────────────────────────────────────────────────

/**
 * Storage.registerSession の戻り値。
 * 登録されたセッション ID 文字列。
 */
export type SessionId = string;

/**
 * Storage.getConfirmed の戻り値。
 * 確認済みファイル名の集合。
 * localStorage キー: `lme_<sessionId>:confirmed`（string[] として保存）
 */
export type ConfirmedSet = Set<string>;