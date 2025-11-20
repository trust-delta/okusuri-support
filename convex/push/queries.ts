import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * 現在のユーザーのサブスクリプション一覧を取得
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return subscriptions;
  },
});

/**
 * グループ内の全サブスクリプションを取得
 */
export const listByGroup = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループメンバーであることを確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    return subscriptions;
  },
});

/**
 * 特定のエンドポイントのサブスクリプションを取得
 */
export const getByEndpoint = query({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    // 自分のサブスクリプションのみ返す
    if (subscription && subscription.userId === userId) {
      return subscription;
    }

    return null;
  },
});
