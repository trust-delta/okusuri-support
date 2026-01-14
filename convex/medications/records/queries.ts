import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { type QueryCtx, query } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

type TimingStats = {
  taken: number;
  skipped: number;
  pending: number;
  rate: number;
};

type DailyStats = Record<
  string,
  { taken: number; skipped: number; pending: number; rate: number }
>;

type MonthlyStatsResult = {
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  totalPending: number;
  adherenceRate: number;
  dailyStats: DailyStats;
  timingStats: {
    morning: TimingStats;
    noon: TimingStats;
    evening: TimingStats;
    bedtime: TimingStats;
  };
  asNeeded: {
    taken: number;
    skipped: number;
    pending: number;
    total: number;
  };
};

/**
 * 指定日の服薬記録を取得
 */
export const getTodayRecords = query({
  args: {
    groupId: v.id("groups"),
    scheduledDate: v.string(),
    patientId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Result<Doc<"medicationRecords">[]>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // patientIdが指定されている場合は、その患者の記録のみを取得
    // 指定されていない場合は、グループ全体の記録を取得
    let records: Doc<"medicationRecords">[];
    if (args.patientId) {
      const targetPatientId = args.patientId;
      // サポーターでない場合は自分の記録のみ
      if (membership.role !== "supporter" && targetPatientId !== userId) {
        return error("他のユーザーの記録を閲覧する権限がありません");
      }
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_patientId_scheduledDate", (q) =>
          q
            .eq("patientId", targetPatientId)
            .eq("scheduledDate", args.scheduledDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
    } else {
      // グループ全体の記録を取得
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_groupId_scheduledDate", (q) =>
          q.eq("groupId", args.groupId).eq("scheduledDate", args.scheduledDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
    }

    return success(records);
  },
});

/**
 * 指定月の服薬記録を全て取得
 */
export const getMonthlyRecords = query({
  args: {
    groupId: v.id("groups"),
    patientId: v.optional(v.string()),
    year: v.number(),
    month: v.number(), // 1-12
  },
  handler: async (ctx, args): Promise<Result<Doc<"medicationRecords">[]>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // 月の範囲を計算（YYYY-MM-DD形式）
    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const endDay = new Date(args.year, args.month, 0).getDate(); // 月末日
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // patientIdが指定されている場合は、その患者の記録のみを取得
    // 指定されていない場合は、グループ全体の記録を取得
    let records: Doc<"medicationRecords">[];
    if (args.patientId) {
      const targetPatientId = args.patientId;
      // サポーターでない場合は自分の記録のみ
      if (membership.role !== "supporter" && targetPatientId !== userId) {
        return error("他のユーザーの記録を閲覧する権限がありません");
      }
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_patientId_scheduledDate", (q) =>
          q
            .eq("patientId", targetPatientId)
            .gte("scheduledDate", startDate)
            .lte("scheduledDate", endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
    } else {
      // グループ全体の記録を取得
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_groupId_scheduledDate", (q) =>
          q
            .eq("groupId", args.groupId)
            .gte("scheduledDate", startDate)
            .lte("scheduledDate", endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
    }

    return success(records);
  },
});

/**
 * 指定月の統計情報を取得
 */
/**
 * 指定した日付に有効な処方箋を取得する
 * @param ctx Convex context
 * @param groupId グループID
 * @param date YYYY-MM-DD形式の日付
 * @returns 有効な処方箋の配列
 */
async function getActivePrescriptionsForDate(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  date: string,
) {
  const allPrescriptions = await ctx.db
    .query("prescriptions")
    .withIndex("by_groupId_isActive", (q) =>
      q.eq("groupId", groupId).eq("isActive", true),
    )
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  return allPrescriptions.filter((prescription) => {
    const startDate = prescription.startDate;
    const endDate = prescription.endDate;

    // 開始日 <= date
    const isAfterStart = date >= startDate;
    // 終了日が未設定、または date <= 終了日
    const isBeforeEnd = !endDate || date <= endDate;

    return isAfterStart && isBeforeEnd;
  });
}

/**
 * 指定した日付に有効な処方箋から期待される服薬回数を計算
 * @param ctx Convex context
 * @param prescriptions 有効な処方箋の配列
 * @returns 期待される服薬回数（定期服用のみ、頓服除く）
 */
async function calculateExpectedCountForPrescriptions(
  ctx: QueryCtx,
  prescriptions: Doc<"prescriptions">[],
) {
  let expectedCount = 0;

  for (const prescription of prescriptions) {
    // この処方箋に含まれる薬を取得
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", prescription._id),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // 各薬のスケジュールを取得
    for (const medicine of medicines) {
      const schedule = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .first();

      if (schedule?.timings) {
        // 頓服を除いた定期服用のタイミング数をカウント
        const regularTimings = schedule.timings.filter((t) => t !== "asNeeded");
        expectedCount += regularTimings.length;
      }
    }
  }

  return expectedCount;
}

export const getMonthlyStats = query({
  args: {
    groupId: v.id("groups"),
    patientId: v.optional(v.string()),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args): Promise<Result<MonthlyStatsResult>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // 月の範囲を計算
    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const endDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // patientIdが指定されている場合は、その患者の記録のみを取得
    // 指定されていない場合は、グループ全体の記録を取得
    let records: Doc<"medicationRecords">[];
    if (args.patientId) {
      const targetPatientId = args.patientId;
      // サポーターでない場合は自分の記録のみ
      if (membership.role !== "supporter" && targetPatientId !== userId) {
        return error("他のユーザーの記録を閲覧する権限がありません");
      }
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_patientId_scheduledDate", (q) =>
          q
            .eq("patientId", targetPatientId)
            .gte("scheduledDate", startDate)
            .lte("scheduledDate", endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
    } else {
      // グループ全体の記録を取得
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_groupId_scheduledDate", (q) =>
          q
            .eq("groupId", args.groupId)
            .gte("scheduledDate", startDate)
            .lte("scheduledDate", endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
    }

    // 統計を計算（頓服は別枠で集計）
    let totalTaken = 0;
    let totalSkipped = 0;
    let totalPending = 0;
    // 頓服専用の統計
    let asNeededTaken = 0;
    let asNeededSkipped = 0;
    let asNeededPending = 0;

    const dailyStats: DailyStats = {};
    const timingStats = {
      morning: { taken: 0, skipped: 0, pending: 0, rate: 0 },
      noon: { taken: 0, skipped: 0, pending: 0, rate: 0 },
      evening: { taken: 0, skipped: 0, pending: 0, rate: 0 },
      bedtime: { taken: 0, skipped: 0, pending: 0, rate: 0 },
    };

    for (const record of records) {
      // 頓服は別枠で集計（服用率計算から除外）
      if (record.timing === "asNeeded") {
        if (record.status === "taken") asNeededTaken++;
        else if (record.status === "skipped") asNeededSkipped++;
        else if (record.status === "pending") asNeededPending++;
        continue; // 以降の統計計算をスキップ
      }

      // 定期服用の統計（全体）
      if (record.status === "taken") totalTaken++;
      else if (record.status === "skipped") totalSkipped++;
      else if (record.status === "pending") totalPending++;

      // 日別統計（定期服用のみ）
      if (!dailyStats[record.scheduledDate]) {
        dailyStats[record.scheduledDate] = {
          taken: 0,
          skipped: 0,
          pending: 0,
          rate: 0,
        };
      }
      const dailyStat = dailyStats[record.scheduledDate];
      if (dailyStat) {
        if (record.status === "taken") dailyStat.taken++;
        else if (record.status === "skipped") dailyStat.skipped++;
        else if (record.status === "pending") dailyStat.pending++;
      }

      // タイミング別統計（定期服用のみ）
      if (record.timing in timingStats) {
        if (record.status === "taken")
          timingStats[record.timing as keyof typeof timingStats].taken++;
        else if (record.status === "skipped")
          timingStats[record.timing as keyof typeof timingStats].skipped++;
        else if (record.status === "pending")
          timingStats[record.timing as keyof typeof timingStats].pending++;
      }
    }

    // 月の全ての日に対して、その日の処方箋から期待値を計算
    const daysInMonth = endDay;
    let expectedTotalCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${args.year}-${String(args.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // この日に有効な処方箋を取得
      const activePrescriptions = await getActivePrescriptionsForDate(
        ctx,
        args.groupId,
        dateStr,
      );

      // 処方箋から期待値を計算
      const expectedDailyCount = await calculateExpectedCountForPrescriptions(
        ctx,
        activePrescriptions,
      );

      expectedTotalCount += expectedDailyCount;

      if (!dailyStats[dateStr]) {
        // レコードが1件もない日: 期待値分をpendingとして追加
        dailyStats[dateStr] = {
          taken: 0,
          skipped: 0,
          pending: expectedDailyCount,
          rate: 0,
        };
      } else {
        // レコードがある日: 実際のレコード数と期待値の差分を補正
        const dateStat = dailyStats[dateStr];
        if (dateStat) {
          const actualCount =
            dateStat.taken + dateStat.skipped + dateStat.pending;
          const missingCount = Math.max(0, expectedDailyCount - actualCount);
          dateStat.pending += missingCount;
        }
      }
    }

    // 日別服用率を計算（期待値反映後）
    for (const date in dailyStats) {
      const stats = dailyStats[date];
      if (stats) {
        const total = stats.taken + stats.skipped + stats.pending;
        stats.rate = total > 0 ? (stats.taken / total) * 100 : 0;
      }
    }

    // タイミング別服用率を計算（pending含む）
    for (const timing in timingStats) {
      const stats = timingStats[timing as keyof typeof timingStats];
      if (stats) {
        const total = stats.taken + stats.skipped + stats.pending;
        stats.rate = total > 0 ? (stats.taken / total) * 100 : 0;
      }
    }

    // レコードがない日の分を補正
    // 実際にDBにあるレコード数
    const actualRecordCount = totalTaken + totalSkipped + totalPending;
    // 期待される回数との差分を未記録（pending）として加算
    const missingRecordCount = Math.max(
      0,
      expectedTotalCount - actualRecordCount,
    );
    totalPending += missingRecordCount;

    // 全体服用率を計算（定期服用のみ、pending含む、レコードがない日も含む）
    const totalScheduled = totalTaken + totalSkipped + totalPending;
    const adherenceRate =
      totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

    return success({
      totalScheduled,
      totalTaken,
      totalSkipped,
      totalPending,
      adherenceRate,
      dailyStats,
      timingStats,
      // 頓服は別枠で返す
      asNeeded: {
        taken: asNeededTaken,
        skipped: asNeededSkipped,
        pending: asNeededPending,
        total: asNeededTaken + asNeededSkipped + asNeededPending,
      },
    });
  },
});
