import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * 指定日の服薬記録を取得
 */
export const getTodayRecords = query({
  args: {
    groupId: v.id("groups"),
    scheduledDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_groupId_scheduledDate", (q) =>
        q.eq("groupId", args.groupId).eq("scheduledDate", args.scheduledDate),
      )
      .collect();

    return records;
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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // サポーターでない場合は自分の記録のみ
    const targetPatientId = args.patientId || userId;
    if (membership.role !== "supporter" && targetPatientId !== userId) {
      throw new Error("他のユーザーの記録を閲覧する権限がありません");
    }

    // 月の範囲を計算（YYYY-MM-DD形式）
    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const endDay = new Date(args.year, args.month, 0).getDate(); // 月末日
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // 指定月の記録を取得
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_patientId_scheduledDate", (q) =>
        q
          .eq("patientId", targetPatientId)
          .gte("scheduledDate", startDate)
          .lte("scheduledDate", endDate),
      )
      .collect();

    return records;
  },
});

/**
 * 指定月の統計情報を取得
 */
export const getMonthlyStats = query({
  args: {
    groupId: v.id("groups"),
    patientId: v.optional(v.string()),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // サポーターでない場合は自分の記録のみ
    const targetPatientId = args.patientId || userId;
    if (membership.role !== "supporter" && targetPatientId !== userId) {
      throw new Error("他のユーザーの記録を閲覧する権限がありません");
    }

    // 月の範囲を計算
    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const endDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // 指定月の記録を取得
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_patientId_scheduledDate", (q) =>
        q
          .eq("patientId", targetPatientId)
          .gte("scheduledDate", startDate)
          .lte("scheduledDate", endDate),
      )
      .collect();

    // 統計を計算
    let totalTaken = 0;
    let totalSkipped = 0;
    let totalPending = 0;
    const dailyStats: Record<
      string,
      { taken: number; skipped: number; pending: number; rate: number }
    > = {};
    const timingStats = {
      morning: { taken: 0, skipped: 0, rate: 0 },
      noon: { taken: 0, skipped: 0, rate: 0 },
      evening: { taken: 0, skipped: 0, rate: 0 },
      bedtime: { taken: 0, skipped: 0, rate: 0 },
      asNeeded: { taken: 0, skipped: 0, rate: 0 },
    };

    for (const record of records) {
      // 全体統計
      if (record.status === "taken") totalTaken++;
      else if (record.status === "skipped") totalSkipped++;
      else if (record.status === "pending") totalPending++;

      // 日別統計
      if (!dailyStats[record.scheduledDate]) {
        dailyStats[record.scheduledDate] = {
          taken: 0,
          skipped: 0,
          pending: 0,
          rate: 0,
        };
      }
      if (record.status === "taken") dailyStats[record.scheduledDate].taken++;
      else if (record.status === "skipped")
        dailyStats[record.scheduledDate].skipped++;
      else if (record.status === "pending")
        dailyStats[record.scheduledDate].pending++;

      // タイミング別統計
      if (record.timing in timingStats) {
        if (record.status === "taken")
          timingStats[record.timing as keyof typeof timingStats].taken++;
        else if (record.status === "skipped")
          timingStats[record.timing as keyof typeof timingStats].skipped++;
      }
    }

    // 日別服用率を計算
    for (const date in dailyStats) {
      const stats = dailyStats[date];
      const total = stats.taken + stats.skipped;
      stats.rate = total > 0 ? (stats.taken / total) * 100 : 0;
    }

    // タイミング別服用率を計算
    for (const timing in timingStats) {
      const stats = timingStats[timing as keyof typeof timingStats];
      const total = stats.taken + stats.skipped;
      stats.rate = total > 0 ? (stats.taken / total) * 100 : 0;
    }

    // 全体服用率を計算
    const totalScheduled = totalTaken + totalSkipped + totalPending;
    const adherenceRate =
      totalTaken + totalSkipped > 0
        ? (totalTaken / (totalTaken + totalSkipped)) * 100
        : 0;

    return {
      totalScheduled,
      totalTaken,
      totalSkipped,
      totalPending,
      adherenceRate,
      dailyStats,
      timingStats,
    };
  },
});
