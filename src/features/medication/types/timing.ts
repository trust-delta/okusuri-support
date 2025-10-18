/**
 * 服薬タイミングの型定義
 */

/**
 * 服薬タイミングの値
 * - morning: 朝
 * - noon: 昼
 * - evening: 晩
 * - bedtime: 就寝前
 * - asNeeded: 頓服
 */
export type MedicationTiming =
  | "morning"
  | "noon"
  | "evening"
  | "bedtime"
  | "asNeeded";
