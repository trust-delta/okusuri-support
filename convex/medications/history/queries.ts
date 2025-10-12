import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * 服薬記録の履歴を取得
 */
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
