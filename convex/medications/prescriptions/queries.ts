import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { query } from "../../_generated/server";
import { getActiveMedicationsForDate } from "./helpers";

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
      throw new ConvexError("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // 処方箋一覧を取得（開始日の降順）
    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // startDateで降順ソート（新しい順）
    prescriptions.sort((a, b) => b.startDate.localeCompare(a.startDate));

    return prescriptions;
  },
});

/**
 * グループの削除された処方箋一覧を取得（ゴミ箱用）
 */
export const getDeletedPrescriptions = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // 削除された処方箋一覧を取得（削除日の降順）
    const deletedPrescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_groupId_deletedAt", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

    // deletedAtで降順ソート（新しく削除されたものが上）
    deletedPrescriptions.sort((a, b) => {
      const aTime = a.deletedAt ?? 0;
      const bTime = b.deletedAt ?? 0;
      return bTime - aTime;
    });

    return deletedPrescriptions;
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
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription || prescription.deletedAt !== undefined) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
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
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription || prescription.deletedAt !== undefined) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // この処方箋に紐付く薬を取得
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // 各薬のスケジュールも取得
    const medicinesWithSchedules = await Promise.all(
      medicines.map(async (medicine) => {
        const schedule = await ctx.db
          .query("medicationSchedules")
          .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
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

/**
 * 指定日に有効な薬剤を取得（処方箋ベース）
 */
export const getActiveMedicationsForDateQuery = query({
  args: {
    groupId: v.id("groups"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    return await getActiveMedicationsForDate(ctx, args.groupId, args.date);
  },
});
