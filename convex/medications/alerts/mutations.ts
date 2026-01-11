import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

/**
 * アラートを既読にする
 */
export const markAsRead = mutation({
  args: {
    alertId: v.id("inventoryAlerts"),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // アラートを取得
    const alert = await ctx.db.get(args.alertId);
    if (!alert) {
      return error("アラートが見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), alert.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // 既読にする
    await ctx.db.patch(args.alertId, {
      isRead: true,
      readBy: userId,
      readAt: Date.now(),
    });

    return success({});
  },
});

/**
 * グループの全アラートを既読にする
 */
export const markAllAsRead = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<{ count: number }>> => {
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

    // 未読アラートを取得
    const unreadAlerts = await ctx.db
      .query("inventoryAlerts")
      .withIndex("by_groupId_isRead", (q) =>
        q.eq("groupId", args.groupId).eq("isRead", false),
      )
      .collect();

    const now = Date.now();

    // 全て既読にする
    for (const alert of unreadAlerts) {
      await ctx.db.patch(alert._id, {
        isRead: true,
        readBy: userId,
        readAt: now,
      });
    }

    return success({ count: unreadAlerts.length });
  },
});
