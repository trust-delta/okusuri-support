import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { DEFAULT_NOTIFICATION_TIMES } from "../groups/notification_settings/queries";

/**
 * 服薬記録情報の型
 */
type MedicationRecordInfo = {
  _id: string;
  groupId: string;
  patientId: string;
  medicineName: string;
  dosage?: { amount: number; unit: string };
  timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded";
  scheduledDate: string;
  snoozeCount?: number;
};

/**
 * 服薬記録から通知用情報を抽出するヘルパー
 */
async function extractRecordInfo(
  ctx: QueryCtx,
  record: {
    _id: Id<"medicationRecords">;
    groupId: Id<"groups">;
    patientId: string;
    simpleMedicineName?: string;
    scheduleId?: Id<"medicationSchedules">;
    medicineId?: Id<"medicines">;
    timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded";
    scheduledDate: string;
    snoozeCount?: number;
  },
): Promise<MedicationRecordInfo> {
  let medicineName = record.simpleMedicineName || "お薬";
  let dosage: { amount: number; unit: string } | undefined;

  if (record.scheduleId) {
    const schedule = await ctx.db.get(record.scheduleId);
    if (schedule) {
      dosage = schedule.dosage;

      if (record.medicineId) {
        const medicine = await ctx.db.get(record.medicineId);
        if (medicine) {
          medicineName = medicine.name ?? medicineName;
        }
      }
    }
  }

  return {
    _id: record._id,
    groupId: record.groupId,
    patientId: record.patientId,
    medicineName,
    dosage,
    timing: record.timing,
    scheduledDate: record.scheduledDate,
    snoozeCount: record.snoozeCount,
  };
}

/**
 * 指定日時・タイミングの未服薬記録を取得（スヌーズ中の記録を除外）
 *
 * @internal このクエリはschedulerから呼ばれる内部用
 */
export const getPendingRecordsByTiming = internalQuery({
  args: {
    date: v.string(), // YYYY-MM-DD形式
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
    ),
  },
  handler: async (ctx, args): Promise<MedicationRecordInfo[]> => {
    const now = Date.now();

    // statusがpendingで、指定日時・タイミングの記録を検索
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_scheduledDate", (q) => q.eq("scheduledDate", args.date))
      .filter((q) =>
        q.and(
          q.eq(q.field("timing"), args.timing),
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    // スヌーズ中の記録を除外
    const activeRecords = records.filter((record) => {
      // snoozedUntilがない、または期限切れの場合は通知対象
      return !record.snoozedUntil || record.snoozedUntil <= now;
    });

    // 必要な情報を抽出して返す
    const results = await Promise.all(
      activeRecords.map((record) => extractRecordInfo(ctx, record)),
    );

    return results;
  },
});

/**
 * スヌーズ解除時刻を過ぎた記録を取得
 *
 * @internal このクエリはスヌーズ再通知cronから呼ばれる内部用
 */
export const getSnoozedRecordsDue = internalQuery({
  args: {},
  handler: async (ctx): Promise<MedicationRecordInfo[]> => {
    const now = Date.now();

    // pendingかつスヌーズ中の記録を取得
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_status_snoozedUntil", (q) => q.eq("status", "pending"))
      .filter((q) =>
        q.and(
          q.neq(q.field("snoozedUntil"), undefined),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    // スヌーズ解除時刻を過ぎた記録をフィルタ
    const dueRecords = records.filter((record) => {
      return record.snoozedUntil !== undefined && record.snoozedUntil <= now;
    });

    // 必要な情報を抽出して返す
    const results = await Promise.all(
      dueRecords.map((record) => extractRecordInfo(ctx, record)),
    );

    return results;
  },
});

/**
 * グループの通知時刻設定を取得
 *
 * @internal このクエリはschedulerから呼ばれる内部用
 */
export const getGroupNotificationSettings = internalQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("groupNotificationSettings")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .first();

    if (!settings) {
      return DEFAULT_NOTIFICATION_TIMES;
    }

    return {
      morningTime: settings.morningTime,
      noonTime: settings.noonTime,
      eveningTime: settings.eveningTime,
      bedtimeTime: settings.bedtimeTime,
    };
  },
});

/**
 * 全てのアクティブなグループとその通知設定を取得
 *
 * @internal このクエリはschedulerから呼ばれる内部用
 */
export const getAllGroupsWithNotificationSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    // アクティブなグループを取得（削除されていないもの）
    const groups = await ctx.db
      .query("groups")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // 各グループの通知設定を取得
    const groupSettings = await Promise.all(
      groups.map(async (group) => {
        const settings = await ctx.db
          .query("groupNotificationSettings")
          .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
          .first();

        return {
          groupId: group._id,
          settings: settings
            ? {
                morningTime: settings.morningTime,
                noonTime: settings.noonTime,
                eveningTime: settings.eveningTime,
                bedtimeTime: settings.bedtimeTime,
              }
            : DEFAULT_NOTIFICATION_TIMES,
        };
      }),
    );

    return groupSettings;
  },
});
