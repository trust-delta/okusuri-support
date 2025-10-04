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
    // Convex Authで認証されたユーザーを取得
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

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

// 今日の服薬記録を取得
export const getTodayRecords = query({
  args: {
    groupId: v.id("groups"),
    scheduledDate: v.string(),
  },
  handler: async (ctx, args) => {
    // 認証確認
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

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
      .collect();

    return records;
  },
});
