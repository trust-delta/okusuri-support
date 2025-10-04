import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 簡易服薬記録を作成（薬剤マスタ不要）
export const recordSimpleMedication = mutation({
  args: {
    auth0Id: v.string(),
    groupId: v.id("groups"),
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
      v.literal("asNeeded")
    ),
    scheduledDate: v.string(), // YYYY-MM-DD
    simpleMedicineName: v.optional(v.string()),
    status: v.union(v.literal("taken"), v.literal("skipped")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ユーザーを取得
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
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

    const patientId = patientMember?.userId ?? user._id;

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
      recordedBy: user._id,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// タイミング別に一括記録
export const recordBatchMedications = mutation({
  args: {
    auth0Id: v.string(),
    groupId: v.id("groups"),
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
      v.literal("asNeeded")
    ),
    scheduledDate: v.string(),
    status: v.union(v.literal("taken"), v.literal("skipped")),
  },
  handler: async (ctx, args) => {
    // ユーザーを取得
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // 服薬者のIDを取得
    const patientMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .first();

    const patientId = patientMember?.userId ?? user._id;

    // 該当タイミングのスケジュールを取得
    const schedules = await ctx.db
      .query("medicationSchedules")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    const targetSchedules = schedules.filter((s) =>
      s.timings.includes(args.timing)
    );

    const now = Date.now();

    // 各スケジュールに対して記録を作成
    const recordIds = [];
    for (const schedule of targetSchedules) {
      const recordId = await ctx.db.insert("medicationRecords", {
        medicineId: schedule.medicineId,
        scheduleId: schedule._id,
        simpleMedicineName: undefined,
        groupId: args.groupId,
        patientId,
        timing: args.timing,
        scheduledDate: args.scheduledDate,
        takenAt: args.status === "taken" ? now : undefined,
        status: args.status,
        recordedBy: user._id,
        notes: undefined,
        createdAt: now,
        updatedAt: now,
      });
      recordIds.push(recordId);
    }

    return recordIds;
  },
});

// 今日の服薬記録を取得
export const getTodayRecords = query({
  args: {
    auth0Id: v.string(),
    groupId: v.id("groups"),
    scheduledDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    // ユーザーを取得
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      return [];
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return [];
    }

    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_groupId_scheduledDate", (q) =>
        q.eq("groupId", args.groupId).eq("scheduledDate", args.scheduledDate)
      )
      .collect();

    return records;
  },
});
