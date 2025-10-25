import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * 処方箋を作成
 */
export const createPrescription = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.optional(v.string()), // YYYY-MM-DD
    notes: v.optional(v.string()),
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

    // 日付の妥当性チェック
    if (args.endDate && args.startDate > args.endDate) {
      throw new Error("終了日は開始日より後である必要があります");
    }

    const now = Date.now();
    const prescriptionId = await ctx.db.insert("prescriptions", {
      groupId: args.groupId,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      notes: args.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return prescriptionId;
  },
});

/**
 * 処方箋を更新
 */
export const updatePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
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

    // 更新後の値を計算
    const newStartDate = args.startDate ?? prescription.startDate;
    const newEndDate = args.endDate !== undefined ? args.endDate : prescription.endDate;

    // 日付の妥当性チェック
    if (newEndDate && newStartDate > newEndDate) {
      throw new Error("終了日は開始日より後である必要があります");
    }

    // 更新するフィールドを準備
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.prescriptionId, updates);

    return args.prescriptionId;
  },
});

/**
 * 処方箋を削除
 */
export const deletePrescription = mutation({
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

    // この処方箋に紐付く薬があるか確認
    const relatedMedicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) => q.eq("prescriptionId", args.prescriptionId))
      .collect();

    if (relatedMedicines.length > 0) {
      throw new Error("この処方箋に紐付く薬が存在するため、削除できません");
    }

    await ctx.db.delete(args.prescriptionId);
  },
});
