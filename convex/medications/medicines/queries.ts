import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

type MedicineWithDetails = Doc<"medicines"> & {
  prescriptionName?: string;
  dosageUnit?: string;
};

/**
 * グループの薬一覧を取得
 */
export const getGroupMedicines = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<MedicineWithDetails[]>> => {
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

    // 削除されていない薬を取得
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // 処方箋名とスケジュールの用量単位を付加
    const medicinesWithDetails = await Promise.all(
      medicines.map(async (medicine) => {
        let prescriptionName: string | undefined;
        let dosageUnit: string | undefined;

        if (medicine.prescriptionId) {
          const prescription = await ctx.db.get(medicine.prescriptionId);
          prescriptionName = prescription?.name;
        }

        // スケジュールから用量単位を取得
        const schedule = await ctx.db
          .query("medicationSchedules")
          .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
          .first();

        if (schedule?.dosage?.unit) {
          dosageUnit = schedule.dosage.unit;
        }

        return {
          ...medicine,
          prescriptionName,
          dosageUnit,
        };
      }),
    );

    return success(medicinesWithDetails);
  },
});

/**
 * 薬の服薬記録件数を取得（削除確認用）
 */
export const getMedicineRecordCount = query({
  args: {
    medicineId: v.id("medicines"),
  },
  handler: async (ctx, args): Promise<Result<number>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) {
      return error("薬が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), medicine.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // この薬の服薬記録を取得（削除されていないもの）
    const records = await ctx.db
      .query("medicationRecords")
      .filter((q) =>
        q.and(
          q.eq(q.field("medicineId"), args.medicineId),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    return success(records.length);
  },
});
