import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 履歴から服薬記録を復元
export const restoreMedicationRecord = mutation({
  args: {
    historyId: v.id("medicationRecordsHistory"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 履歴レコードを取得
    const historyRecord = await ctx.db.get(args.historyId);
    if (!historyRecord) {
      throw new Error("履歴が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), historyRecord.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    const now = Date.now();

    // 削除による履歴の場合
    if (historyRecord.historyType === "deleted") {
      // 新しいレコードとして復元
      const newRecordId = await ctx.db.insert("medicationRecords", {
        medicineId: historyRecord.medicineId,
        scheduleId: historyRecord.scheduleId,
        simpleMedicineName: historyRecord.simpleMedicineName,
        groupId: historyRecord.groupId,
        patientId: historyRecord.patientId,
        timing: historyRecord.timing,
        scheduledDate: historyRecord.scheduledDate,
        takenAt: historyRecord.takenAt,
        status: historyRecord.status,
        recordedBy: userId, // 復元者を記録
        notes: historyRecord.notes,
        createdAt: historyRecord.createdAt,
        updatedAt: now,
      });

      return { success: true, recordId: newRecordId };
    }

    // 更新による履歴の場合
    if (historyRecord.historyType === "updated") {
      // 現在のレコードを取得
      const currentRecord = await ctx.db.get(historyRecord.originalRecordId);
      if (!currentRecord) {
        throw new Error("元のレコードが見つかりません");
      }

      // 現在の状態を履歴に保存
      await ctx.db.insert("medicationRecordsHistory", {
        originalRecordId: historyRecord.originalRecordId,
        medicineId: currentRecord.medicineId,
        scheduleId: currentRecord.scheduleId,
        simpleMedicineName: currentRecord.simpleMedicineName,
        groupId: currentRecord.groupId,
        patientId: currentRecord.patientId,
        timing: currentRecord.timing,
        scheduledDate: currentRecord.scheduledDate,
        takenAt: currentRecord.takenAt,
        status: currentRecord.status,
        recordedBy: currentRecord.recordedBy,
        notes: currentRecord.notes,
        createdAt: currentRecord.createdAt,
        updatedAt: currentRecord.updatedAt,
        historyType: "updated",
        archivedAt: now,
        archivedBy: userId,
      });

      // 履歴の状態に戻す
      await ctx.db.patch(historyRecord.originalRecordId, {
        medicineId: historyRecord.medicineId,
        scheduleId: historyRecord.scheduleId,
        simpleMedicineName: historyRecord.simpleMedicineName,
        timing: historyRecord.timing,
        scheduledDate: historyRecord.scheduledDate,
        takenAt: historyRecord.takenAt,
        status: historyRecord.status,
        notes: historyRecord.notes,
        updatedAt: now,
      });

      return { success: true, recordId: historyRecord.originalRecordId };
    }

    throw new Error("不明な履歴タイプです");
  },
});

// 服薬記録の履歴を取得
export const getRecordHistory = query({
  args: {
    recordId: v.optional(v.id("medicationRecords")),
    groupId: v.optional(v.id("groups")),
    patientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // recordIdが指定されている場合、そのレコードの履歴を取得
    if (args.recordId !== undefined) {
      const recordId = args.recordId;
      return await ctx.db
        .query("medicationRecordsHistory")
        .withIndex("by_originalRecordId", (q) =>
          q.eq("originalRecordId", recordId),
        )
        .order("desc")
        .collect();
    }

    // groupIdが指定されている場合、グループの履歴を取得
    if (args.groupId !== undefined) {
      const groupId = args.groupId;
      // グループメンバーか確認
      const membership = await ctx.db
        .query("groupMembers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("groupId"), groupId))
        .first();

      if (!membership) {
        return [];
      }

      return await ctx.db
        .query("medicationRecordsHistory")
        .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
        .order("desc")
        .collect();
    }

    // patientIdが指定されている場合、患者の履歴を取得
    if (args.patientId !== undefined) {
      const patientId = args.patientId;
      return await ctx.db
        .query("medicationRecordsHistory")
        .withIndex("by_patientId", (q) => q.eq("patientId", patientId))
        .order("desc")
        .collect();
    }

    return [];
  },
});
