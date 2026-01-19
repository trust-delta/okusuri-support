import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";

/**
 * サンプルデータ定義
 * ブラウザ検証やE2Eテスト用のサンプルデータ
 */

// 処方箋サンプル
export const samplePrescriptions = [
  {
    name: "内科定期処方",
    notes: "○○内科クリニック - 高血圧・糖尿病の定期処方",
    dayOffset: -30, // 30日前から
    endDayOffset: 60, // 60日後まで
  },
  {
    name: "整形外科処方",
    notes: "△△整形外科 - 腰痛治療",
    dayOffset: -14,
    endDayOffset: 14,
  },
] as const;

// 薬剤サンプル
export const sampleMedicines = [
  // 処方箋1: 内科定期処方
  {
    prescriptionIndex: 0,
    name: "アムロジピン錠5mg",
    description: "高血圧治療薬（カルシウム拮抗薬）",
    timings: ["morning"] as const,
    dosage: { amount: 1, unit: "錠" },
    inventory: { quantity: 30, warningThreshold: 7 },
  },
  {
    prescriptionIndex: 0,
    name: "メトホルミン錠250mg",
    description: "糖尿病治療薬（ビグアナイド系）",
    timings: ["morning", "evening"] as const,
    dosage: { amount: 1, unit: "錠" },
    inventory: { quantity: 45, warningThreshold: 14 },
  },
  // 処方箋2: 整形外科処方
  {
    prescriptionIndex: 1,
    name: "ロキソプロフェン錠60mg",
    description: "消炎鎮痛剤",
    timings: ["morning", "noon", "evening"] as const,
    dosage: { amount: 1, unit: "錠" },
    inventory: { quantity: 21, warningThreshold: 7 },
  },
  {
    prescriptionIndex: 1,
    name: "レバミピド錠100mg",
    description: "胃粘膜保護剤",
    timings: ["morning", "noon", "evening"] as const,
    dosage: { amount: 1, unit: "錠" },
    inventory: { quantity: 21, warningThreshold: 7 },
  },
] as const;

// 服薬記録を生成（過去7日分＋今日）
export function generateMedicationRecords(
  scheduleId: string,
  patientId: string,
  timing: string,
): Array<{
  scheduledDate: string;
  status: "taken" | "pending" | "skipped";
  takenAt?: number;
}> {
  const records: Array<{
    scheduledDate: string;
    status: "taken" | "pending" | "skipped";
    takenAt?: number;
  }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 7; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    if (i === 0) {
      // 今日：pending
      records.push({
        scheduledDate: dateStr,
        status: "pending",
      });
    } else if (i <= 2) {
      // 昨日〜2日前: 80%服用済み、20%未服用
      const isTaken = Math.random() > 0.2;
      if (isTaken) {
        records.push({
          scheduledDate: dateStr,
          status: "taken",
          takenAt: date.getTime() + getTimingOffset(timing),
        });
      } else {
        records.push({
          scheduledDate: dateStr,
          status: "pending",
        });
      }
    } else {
      // 3日前〜7日前: すべて服用済み
      records.push({
        scheduledDate: dateStr,
        status: "taken",
        takenAt: date.getTime() + getTimingOffset(timing),
      });
    }
  }

  return records;
}

// タイミングに応じた時間オフセット（ミリ秒）
function getTimingOffset(timing: string): number {
  switch (timing) {
    case "morning":
      return 8 * 60 * 60 * 1000; // 8:00
    case "noon":
      return 12 * 60 * 60 * 1000; // 12:00
    case "evening":
      return 18 * 60 * 60 * 1000; // 18:00
    case "bedtime":
      return 21 * 60 * 60 * 1000; // 21:00
    default:
      return 10 * 60 * 60 * 1000;
  }
}

/**
 * 日付文字列を取得（YYYY-MM-DD形式）
 */
export function getDateString(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

/**
 * テストユーザーのメールアドレス一覧
 */
export const TEST_EMAILS = [
  "test@example.com",
  "supporter@example.com",
  "patient@example.com",
] as const;

/**
 * テストユーザーかどうかを判定
 */
export function isTestUser(email: string | undefined): boolean {
  if (!email) return false;
  return TEST_EMAILS.includes(email as (typeof TEST_EMAILS)[number]);
}

/**
 * 認証情報からユーザーIDを取得するヘルパー
 */
export async function getAuthenticatedUserId(
  ctx: MutationCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return identity.subject;
}
