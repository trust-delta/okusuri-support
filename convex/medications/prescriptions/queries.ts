import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * グループの処方箋一覧を取得
 */
export const getPrescriptions = query({
  args: {
    groupId: v.id("groups"),
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

    // 処方箋一覧を取得（開始日の降順）
    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    // startDateで降順ソート（新しい順）
    prescriptions.sort((a, b) => b.startDate.localeCompare(a.startDate));

    return prescriptions;
  },
});

/**
 * 処方箋の詳細を取得
 */
export const getPrescription = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new Error("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    return prescription;
  },
});

/**
 * 処方箋に紐付く薬の一覧を取得
 */
export const getPrescriptionMedicines = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new Error("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // この処方箋に紐付く薬を取得
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) => q.eq("prescriptionId", args.prescriptionId))
      .collect();

    // 各薬のスケジュールも取得
    const medicinesWithSchedules = await Promise.all(
      medicines.map(async (medicine) => {
        const schedule = await ctx.db
          .query("medicationSchedules")
          .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
          .first();

        return {
          ...medicine,
          schedule,
        };
      }),
    );

    return medicinesWithSchedules;
  },
});
