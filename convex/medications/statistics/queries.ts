import { v } from "convex/values";
import { query } from "../../_generated/server";
import {
  applyMedicineGrouping,
  generateDateRange,
  isDateInRange,
  type MedicineStats,
} from "./helpers";

/**
 * 期間別の薬剤統計を取得
 *
 * 指定期間内の各薬剤について、以下の統計を計算：
 * - 合計用量（totalAmount）
 * - 服用回数（totalDoses）
 * - 実際に服用した回数（takenCount）
 * - スキップした回数（skippedCount）
 * - 未記録の回数（pendingCount）
 * - 服用率（adherenceRate）
 */
export const getMedicationStatsByPeriod = query({
  args: {
    groupId: v.id("groups"),
    patientId: v.optional(v.string()),
    medicineId: v.optional(v.id("medicines")), // 特定の薬に絞る場合
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    // 期間内の全日付を生成
    const dates = generateDateRange(args.startDate, args.endDate);

    // 薬別の統計データを初期化
    const medicineStatsMap: Record<string, MedicineStats> = {};

    // タイミング別統計を初期化
    type TimingStats = {
      taken: number;
      skipped: number;
      pending: number;
      total: number;
      rate: number;
    };
    const timingStatsMap: Record<string, TimingStats> = {
      morning: { taken: 0, skipped: 0, pending: 0, total: 0, rate: 0 },
      noon: { taken: 0, skipped: 0, pending: 0, total: 0, rate: 0 },
      evening: { taken: 0, skipped: 0, pending: 0, total: 0, rate: 0 },
      bedtime: { taken: 0, skipped: 0, pending: 0, total: 0, rate: 0 },
    };
    const asNeededStats = { taken: 0, skipped: 0, pending: 0, total: 0 };

    // 各日付について処理
    for (const date of dates) {
      // その日に有効な処方箋を取得
      const allPrescriptions = await ctx.db
        .query("prescriptions")
        .withIndex("by_groupId_isActive", (q) =>
          q.eq("groupId", args.groupId).eq("isActive", true),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      const activePrescriptions = allPrescriptions.filter((prescription) =>
        isDateInRange(date, prescription.startDate, prescription.endDate),
      );

      // 各処方箋の薬を処理
      for (const prescription of activePrescriptions) {
        const medicines = await ctx.db
          .query("medicines")
          .withIndex("by_prescriptionId", (q) =>
            q.eq("prescriptionId", prescription._id),
          )
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect();

        for (const medicine of medicines) {
          // 特定の薬に絞る場合
          if (args.medicineId && medicine._id !== args.medicineId) {
            continue;
          }

          const schedule = await ctx.db
            .query("medicationSchedules")
            .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
            .filter((q) => q.eq(q.field("deletedAt"), undefined))
            .first();

          if (!schedule?.timings) continue;

          // 薬名をキーとして統計データを初期化
          if (!medicineStatsMap[medicine.name]) {
            medicineStatsMap[medicine.name] = {
              medicineId: medicine._id,
              medicineName: medicine.name,
              totalAmount: 0,
              unit: schedule.dosage?.unit || "",
              totalDoses: 0,
              takenCount: 0,
              skippedCount: 0,
              pendingCount: 0,
              adherenceRate: 0,
            };
          }

          // タイミング数を期待値に加算（頓服を除く）
          const regularTimings = schedule.timings.filter(
            (t) => t !== "asNeeded",
          );
          medicineStatsMap[medicine.name].totalDoses += regularTimings.length;

          // 用量がある場合は合計用量を計算
          if (schedule.dosage) {
            medicineStatsMap[medicine.name].totalAmount +=
              schedule.dosage.amount * regularTimings.length;
          }

          // タイミング別の期待値を加算（頓服を除く）
          for (const timing of regularTimings) {
            if (timingStatsMap[timing]) {
              timingStatsMap[timing].total++;
            }
          }
        }
      }
    }

    // 実際の記録を取得して集計
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // 期間とpatientIdでフィルタ（頓服は別途処理）
    const filteredRecords = records.filter((record) => {
      const isInPeriod =
        record.scheduledDate >= args.startDate &&
        record.scheduledDate <= args.endDate;
      const matchesPatient =
        !args.patientId || record.patientId === args.patientId;
      return isInPeriod && matchesPatient;
    });

    // タイミング別の実績を集計
    for (const record of filteredRecords) {
      if (record.timing === "asNeeded") {
        // 頓服は別枠で集計
        asNeededStats.total++;
        if (record.status === "taken") {
          asNeededStats.taken++;
        } else if (record.status === "skipped") {
          asNeededStats.skipped++;
        } else if (record.status === "pending") {
          asNeededStats.pending++;
        }
      } else {
        // 通常のタイミング
        const timingStats = timingStatsMap[record.timing];
        if (timingStats) {
          if (record.status === "taken") {
            timingStats.taken++;
          } else if (record.status === "skipped") {
            timingStats.skipped++;
          } else if (record.status === "pending") {
            timingStats.pending++;
          }
        }
      }
    }

    // 頓服を除く記録のみを薬別統計に使用
    const regularRecords = filteredRecords.filter(
      (record) => record.timing !== "asNeeded",
    );

    // 記録を薬ごとに集計（頓服を除く）
    for (const record of regularRecords) {
      if (!record.medicineId) continue;

      // medicineIdから薬名を取得
      const medicine = await ctx.db.get(record.medicineId);
      if (!medicine || !medicineStatsMap[medicine.name]) continue;

      // ステータスに応じてカウント
      if (record.status === "taken") {
        medicineStatsMap[medicine.name].takenCount++;
      } else if (record.status === "skipped") {
        medicineStatsMap[medicine.name].skippedCount++;
      } else if (record.status === "pending") {
        medicineStatsMap[medicine.name].pendingCount++;
      }
    }

    // 各薬の服用率を計算
    for (const medicineName of Object.keys(medicineStatsMap)) {
      const stats = medicineStatsMap[medicineName];
      const actualRecords =
        stats.takenCount + stats.skippedCount + stats.pendingCount;

      // 未記録分をpendingに追加
      if (stats.totalDoses > actualRecords) {
        stats.pendingCount += stats.totalDoses - actualRecords;
      }

      // 服用率を計算
      if (stats.totalDoses > 0) {
        stats.adherenceRate = (stats.takenCount / stats.totalDoses) * 100;
      }
    }

    // タイミング別統計の服用率を計算
    for (const timing of Object.keys(timingStatsMap)) {
      const stats = timingStatsMap[timing];
      const actualRecords = stats.taken + stats.skipped + stats.pending;

      // 未記録分をpendingに追加
      if (stats.total > actualRecords) {
        stats.pending += stats.total - actualRecords;
      }

      // 服用率を計算
      if (stats.total > 0) {
        stats.rate = (stats.taken / stats.total) * 100;
      }
    }

    // グルーピングを適用
    const groupedStats = await applyMedicineGrouping(
      ctx,
      args.groupId,
      medicineStatsMap,
    );

    // 配列に変換してソート（服用回数の多い順）
    const medicinesArray = Object.values(groupedStats).sort(
      (a, b) => b.totalDoses - a.totalDoses,
    );

    // サマリーを計算
    const summary = {
      totalMedicines: medicinesArray.length,
      totalDoses: medicinesArray.reduce((sum, m) => sum + m.totalDoses, 0),
      totalTaken: medicinesArray.reduce((sum, m) => sum + m.takenCount, 0),
      totalSkipped: medicinesArray.reduce((sum, m) => sum + m.skippedCount, 0),
      totalPending: medicinesArray.reduce((sum, m) => sum + m.pendingCount, 0),
      overallAdherenceRate: 0,
    };

    if (summary.totalDoses > 0) {
      summary.overallAdherenceRate =
        (summary.totalTaken / summary.totalDoses) * 100;
    }

    return {
      medicines: medicinesArray,
      summary,
      timingStats: timingStatsMap,
      asNeeded: asNeededStats,
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
        days: dates.length,
      },
    };
  },
});
