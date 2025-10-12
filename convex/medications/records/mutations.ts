import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../../_generated/server";

/**
 * 簡易服薬記録を作成（薬剤マスタ不要）
 */
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

    // 服薬者のIDを取得(患者本人または患者がいない場合は記録者)
    const patientMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .first();

    const patientId = patientMember?.userId ?? userId;

    // 薬剤情報のバリデーション（薬剤名が必要）
    if (!args.simpleMedicineName) {
      throw new Error("薬剤名が必要です");
    }

    const now = Date.now();

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
});

/**
 * 服薬記録を更新
 */
export const updateMedicationRecord = mutation({
  args: {
    recordId: v.id("medicationRecords"),
    status: v.optional(v.union(v.literal("taken"), v.literal("skipped"))),
    notes: v.optional(v.string()),
    simpleMedicineName: v.optional(v.string()),
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

    const now = Date.now();

    // 現在のレコードを履歴に保存
    await ctx.db.insert("medicationRecordsHistory", {
      originalRecordId: args.recordId,
      medicineId: record.medicineId,
      scheduleId: record.scheduleId,
      simpleMedicineName: record.simpleMedicineName,
      groupId: record.groupId,
      patientId: record.patientId,
      timing: record.timing,
      scheduledDate: record.scheduledDate,
      takenAt: record.takenAt,
      status: record.status,
      recordedBy: record.recordedBy,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      historyType: "updated",
      archivedAt: now,
      archivedBy: userId,
    });

    // レコードを更新
    const updateData: {
      status?: "taken" | "skipped";
      notes?: string;
      simpleMedicineName?: string;
      takenAt?: number | undefined;
      updatedAt: number;
    } = {
      updatedAt: now,
    };

    if (args.status !== undefined) {
      updateData.status = args.status;
      updateData.takenAt = args.status === "taken" ? now : undefined;
    }
    if (args.notes !== undefined) {
      updateData.notes = args.notes;
    }
    if (args.simpleMedicineName !== undefined) {
      updateData.simpleMedicineName = args.simpleMedicineName;
    }

    await ctx.db.patch(args.recordId, updateData);

    return { success: true };
  },
});

/**
 * 服薬記録を削除（履歴に保存）
 */
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

    const now = Date.now();

    // 履歴テーブルに保存
    await ctx.db.insert("medicationRecordsHistory", {
      originalRecordId: args.recordId,
      medicineId: record.medicineId,
      scheduleId: record.scheduleId,
      simpleMedicineName: record.simpleMedicineName,
      groupId: record.groupId,
      patientId: record.patientId,
      timing: record.timing,
      scheduledDate: record.scheduledDate,
      takenAt: record.takenAt,
      status: record.status,
      recordedBy: record.recordedBy,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      historyType: "deleted",
      archivedAt: now,
      archivedBy: userId,
    });

    // 元のレコードを削除
    await ctx.db.delete(args.recordId);

    return { success: true };
  },
});
