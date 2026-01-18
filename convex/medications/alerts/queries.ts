import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

/**
 * 未読アラートを取得
 */
export const getUnreadAlerts = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<Doc<"inventoryAlerts">[]>> => {
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

    // 未読アラートを取得（新しい順）
    const alerts = await ctx.db
      .query("inventoryAlerts")
      .withIndex("by_groupId_isRead", (q) =>
        q.eq("groupId", args.groupId).eq("isRead", false),
      )
      .order("desc")
      .collect();

    return success(alerts);
  },
});

/**
 * 未読アラート数を取得
 */
export const getUnreadAlertCount = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<number>> => {
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

    // 未読アラート数を取得
    const alerts = await ctx.db
      .query("inventoryAlerts")
      .withIndex("by_groupId_isRead", (q) =>
        q.eq("groupId", args.groupId).eq("isRead", false),
      )
      .collect();

    return success(alerts.length);
  },
});

/**
 * アラート履歴を取得
 */
export const getAlertHistory = query({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
    alertType: v.optional(
      v.union(
        v.literal("low_stock"),
        v.literal("unexpected_consumption"),
        v.literal("overdose_warning"),
      ),
    ),
  },
  handler: async (ctx, args): Promise<Result<Doc<"inventoryAlerts">[]>> => {
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

    // アラート履歴を取得（新しい順）
    const alertsQuery = ctx.db
      .query("inventoryAlerts")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .order("desc");

    const alerts = await alertsQuery.take(args.limit ?? 50);

    // フィルタリング
    const filteredAlerts = args.alertType
      ? alerts.filter((a) => a.alertType === args.alertType)
      : alerts;

    return success(filteredAlerts);
  },
});
