import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { error, type Result, success } from "../types/result";

type SubscribeResult = {
  subscriptionId: Id<"pushSubscriptions">;
  isNew: boolean;
};

type UnsubscribeResult = {
  success: boolean;
  message: string;
};

type UnsubscribeAllResult = {
  success: boolean;
  count: number;
};

/**
 * プッシュサブスクリプションを登録または更新
 */
export const subscribe = mutation({
  args: {
    subscription: v.object({
      endpoint: v.string(),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Result<SubscribeResult>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const now = Date.now();

    // 既存のサブスクリプションを検索（同じendpoint）
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) =>
        q.eq("endpoint", args.subscription.endpoint),
      )
      .first();

    if (existing) {
      // 既存のサブスクリプションを更新
      await ctx.db.patch(existing._id, {
        userId,
        keys: args.subscription.keys,
        userAgent: args.userAgent,
        updatedAt: now,
      });

      return success({ subscriptionId: existing._id, isNew: false });
    }

    // 新規サブスクリプションを作成
    const subscriptionId = await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: args.subscription.endpoint,
      keys: args.subscription.keys,
      userAgent: args.userAgent,
      createdAt: now,
      updatedAt: now,
    });

    return success({ subscriptionId, isNew: true });
  },
});

/**
 * プッシュサブスクリプションを削除
 */
export const unsubscribe = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args): Promise<Result<UnsubscribeResult>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // エンドポイントで検索
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (!subscription) {
      // 既に削除されている場合はスキップ
      return success({
        success: true,
        message: "サブスクリプションが見つかりませんでした",
      });
    }

    // 自分のサブスクリプションのみ削除可能
    if (subscription.userId !== userId) {
      return error("このサブスクリプションを削除する権限がありません");
    }

    await ctx.db.delete(subscription._id);

    return success({
      success: true,
      message: "サブスクリプションを削除しました",
    });
  },
});

/**
 * ユーザーの全サブスクリプションを削除
 */
export const unsubscribeAll = mutation({
  args: {},
  handler: async (ctx): Promise<Result<UnsubscribeAllResult>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }

    return success({ success: true, count: subscriptions.length });
  },
});
