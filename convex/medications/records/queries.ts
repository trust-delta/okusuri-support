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
    patientId: v.optional(v.string()),
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

    // patientIdが指定されている場合は、その患者の記録のみを取得
    // 指定されていない場合は、グループ全体の記録を取得
    let records;
    if (args.patientId) {
      const targetPatientId = args.patientId;
      // サポーターでない場合は自分の記録のみ
      if (membership.role !== "supporter" && targetPatientId !== userId) {
        throw new Error("他のユーザーの記録を閲覧する権限がありません");
      }
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_patientId_scheduledDate", (q) =>
          q.eq("patientId", targetPatientId).eq("scheduledDate", args.scheduledDate),
        )
        .collect();
    } else {
      // グループ全体の記録を取得
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_groupId_scheduledDate", (q) =>
          q.eq("groupId", args.groupId).eq("scheduledDate", args.scheduledDate),
        )
        .collect();
    }

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

    // 月の範囲を計算（YYYY-MM-DD形式）
    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const endDay = new Date(args.year, args.month, 0).getDate(); // 月末日
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // patientIdが指定されている場合は、その患者の記録のみを取得
    // 指定されていない場合は、グループ全体の記録を取得
    let records;
    if (args.patientId) {
      const targetPatientId = args.patientId;
      // サポーターでない場合は自分の記録のみ
      if (membership.role !== "supporter" && targetPatientId !== userId) {
        throw new Error("他のユーザーの記録を閲覧する権限がありません");
      }
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_patientId_scheduledDate", (q) =>
          q
            .eq("patientId", targetPatientId)
            .gte("scheduledDate", startDate)
            .lte("scheduledDate", endDate),
        )
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
        .collect();
    }

    return records;
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
  ctx: any,
  groupId: string,
  date: string,
) {
  const allPrescriptions = await ctx.db
    .query("prescriptions")
    .withIndex("by_groupId", (q: any) => q.eq("groupId", groupId))
    .collect();

  return allPrescriptions.filter((prescription: any) => {
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
  ctx: any,
  prescriptions: any[],
) {
  let expectedCount = 0;

  for (const prescription of prescriptions) {
    // この処方箋に含まれる薬を取得
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q: any) =>
        q.eq("prescriptionId", prescription._id),
      )
      .collect();

    // 各薬のスケジュールを取得
    for (const medicine of medicines) {
      if (!medicine.isActive) continue; // 非アクティブな薬は除外

      const schedule = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q: any) => q.eq("medicineId", medicine._id))
        .first();

      if (schedule && schedule.timings) {
        // 頓服を除いた定期服用のタイミング数をカウント
        const regularTimings = schedule.timings.filter((t: string) => t !== "asNeeded");
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

    // 月の範囲を計算
    const startDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const endDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // patientIdが指定されている場合は、その患者の記録のみを取得
    // 指定されていない場合は、グループ全体の記録を取得
    let records;
    if (args.patientId) {
      const targetPatientId = args.patientId;
      // サポーターでない場合は自分の記録のみ
      if (membership.role !== "supporter" && targetPatientId !== userId) {
        throw new Error("他のユーザーの記録を閲覧する権限がありません");
      }
      records = await ctx.db
        .query("medicationRecords")
        .withIndex("by_patientId_scheduledDate", (q) =>
          q
            .eq("patientId", targetPatientId)
            .gte("scheduledDate", startDate)
            .lte("scheduledDate", endDate),
        )
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

    const dailyStats: Record<
      string,
      { taken: number; skipped: number; pending: number; rate: number }
    > = {};
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
      if (record.status === "taken") dailyStats[record.scheduledDate].taken++;
      else if (record.status === "skipped")
        dailyStats[record.scheduledDate].skipped++;
      else if (record.status === "pending")
        dailyStats[record.scheduledDate].pending++;

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

    // 処方箋なしの薬（フォールバック：isActiveな薬）からも期待値を計算
    const medicinesWithoutPrescription = await ctx.db
      .query("medicines")
      .withIndex("by_groupId_isActive", (q) =>
        q.eq("groupId", args.groupId).eq("isActive", true),
      )
      .collect();

    const fallbackMedicines = medicinesWithoutPrescription.filter(
      (m) => !m.prescriptionId,
    );
    let fallbackExpectedDailyCount = 0;

    for (const medicine of fallbackMedicines) {
      const schedule = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
        .first();

      if (schedule && schedule.timings) {
        const regularTimings = schedule.timings.filter((t) => t !== "asNeeded");
        fallbackExpectedDailyCount += regularTimings.length;
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
      const prescriptionExpectedCount =
        await calculateExpectedCountForPrescriptions(ctx, activePrescriptions);

      // 処方箋ベースの期待値 + フォールバック（処方箋なしの薬）
      const expectedDailyCount =
        prescriptionExpectedCount + fallbackExpectedDailyCount;

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
        const actualCount =
          dailyStats[dateStr].taken +
          dailyStats[dateStr].skipped +
          dailyStats[dateStr].pending;
        const missingCount = Math.max(0, expectedDailyCount - actualCount);
        dailyStats[dateStr].pending += missingCount;
      }
    }

    // 日別服用率を計算（期待値反映後）
    for (const date in dailyStats) {
      const stats = dailyStats[date];
      const total = stats.taken + stats.skipped + stats.pending;
      stats.rate = total > 0 ? (stats.taken / total) * 100 : 0;
    }

    // タイミング別服用率を計算（pending含む）
    for (const timing in timingStats) {
      const stats = timingStats[timing as keyof typeof timingStats];
      const total = stats.taken + stats.skipped + stats.pending;
      stats.rate = total > 0 ? (stats.taken / total) * 100 : 0;
    }

    // レコードがない日の分を補正
    // 実際にDBにあるレコード数
    const actualRecordCount = totalTaken + totalSkipped + totalPending;
    // 期待される回数との差分を未記録（pending）として加算
    const missingRecordCount = Math.max(0, expectedTotalCount - actualRecordCount);
    totalPending += missingRecordCount;

    // 全体服用率を計算（定期服用のみ、pending含む、レコードがない日も含む）
    const totalScheduled = totalTaken + totalSkipped + totalPending;
    const adherenceRate =
      totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

    return {
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
    };
  },
});;;;;
