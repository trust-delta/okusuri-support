import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 簡易服薬記録を作成（薬剤マスタ不要）
export const recordSimpleMedication = mutation({
  args: {
    groupId: v.id("groups"),
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
      v.literal("asNeeded"),
    ),
    scheduledDate: v.string(), // YYYY-MM-DD
    simpleMedicineName: v.optional(v.string()),
    status: v.union(v.literal("taken"), v.literal("skipped")),
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

    // 服薬者のIDを取得（患者本人または患者がいない場合は記録者）
    const patientMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .first();

    const patientId = patientMember?.userId ?? userId;

    const now = Date.now();

    // 同じタイミング・日付の削除済みレコードを検索
    const deletedRecord = await ctx.db
      .query("medicationRecords")
      .withIndex("by_patientId_timing_scheduledDate", (q) =>
        q
          .eq("patientId", patientId)
          .eq("timing", args.timing)
          .eq("scheduledDate", args.scheduledDate),
      )
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .first();

    if (deletedRecord) {
      // 削除済みレコードを復元
      await ctx.db.patch(deletedRecord._id, {
        simpleMedicineName: args.simpleMedicineName,
        status: args.status,
        takenAt: args.status === "taken" ? now : undefined,
        recordedBy: userId,
        notes: args.notes,
        deletedAt: undefined,
        deletedBy: undefined,
        updatedAt: now,
      });
      return deletedRecord._id;
    }

    // 新規レコード作成
    return await ctx.db.insert("medicationRecords", {
      medicineId: undefined,
      scheduleId: undefined,
      simpleMedicineName: args.simpleMedicineName,
      groupId: args.groupId,
      patientId,
      timing: args.timing,
      scheduledDate: args.scheduledDate,
      takenAt: args.status === "taken" ? now : undefined,
      status: args.status,
      recordedBy: userId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});;

// 今日の服薬記録を取得
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
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return records;
  },
});

// 服薬記録を論理削除
export const deleteMedicationRecord = mutation({
  args: {
    recordId: v.id("medicationRecords"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 記録を取得
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new Error("記録が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), record.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // 既に削除済みの場合はエラー
    if (record.deletedAt) {
      throw new Error("この記録は既に削除されています");
    }

    const now = Date.now();

    // 論理削除
    await ctx.db.patch(args.recordId, {
      deletedAt: now,
      deletedBy: userId,
      updatedAt: now,
    });

    return { success: true };
  },
});
