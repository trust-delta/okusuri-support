import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * 指定日時・タイミングの未服薬記録を取得
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
      v.literal("bedtime")
    ),
  },
  handler: async (ctx, args) => {
    // statusがpendingで、指定日時・タイミングの記録を検索
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_scheduledDate", (q) => q.eq("scheduledDate", args.date))
      .filter((q) =>
        q.and(
          q.eq(q.field("timing"), args.timing),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    // 必要な情報を抽出して返す
    const results = await Promise.all(
      records.map(async (record) => {
        // 薬剤情報を取得
        let medicineName = record.simpleMedicineName || "お薬";
        let dosage: { amount: number; unit: string } | undefined;

        if (record.scheduleId) {
          const schedule = await ctx.db.get(record.scheduleId);
          if (schedule) {
            dosage = schedule.dosage;

            if (record.medicineId) {
              const medicine = await ctx.db.get(record.medicineId);
              if (medicine) {
                medicineName = medicine.name;
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
        };
      })
    );

    return results;
  },
});
