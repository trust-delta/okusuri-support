import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

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

/**
 * 特定のユーザーIDのサブスクリプション一覧を取得（内部用）
 */
export const listByUserId = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return subscriptions;
  },
});
