"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import webpush from "web-push";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";

// VAPID設定
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = "mailto:support@okusuri-support.example.com";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error(
    "⚠️ VAPID keys are not configured. Push notifications will not work.",
  );
  console.error("VAPID_PUBLIC_KEY:", VAPID_PUBLIC_KEY ? "設定済み" : "未設定");
  console.error(
    "VAPID_PRIVATE_KEY:",
    VAPID_PRIVATE_KEY ? "設定済み" : "未設定",
  );
}

// web-pushの設定
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * プッシュ通知のdata フィールド用バリデータ
 * 通知クリック時の遷移先URLやアクション情報を含む
 */
const pushNotificationDataValidator = v.object({
  url: v.optional(v.string()),
  action: v.optional(v.string()),
  groupId: v.optional(v.string()),
  recordId: v.optional(v.string()),
});

/**
 * プッシュ通知ペイロード
 */
const pushPayloadValidator = v.object({
  title: v.string(),
  body: v.string(),
  icon: v.optional(v.string()),
  badge: v.optional(v.string()),
  tag: v.optional(v.string()),
  data: v.optional(pushNotificationDataValidator),
});

/**
 * テスト通知を送信
 */
export const sendTestNotification = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // ユーザーのサブスクリプションを取得
    const subscriptions = await ctx.runQuery(api.push.queries.list);

    if (subscriptions.length === 0) {
      return {
        success: false,
        message: "プッシュ通知のサブスクリプションが見つかりませんでした",
        sent: 0,
        failed: 0,
      };
    }

    const payload = {
      title: "テスト通知",
      body: "プッシュ通知が正常に動作しています！",
      icon: "/icon-192x192.png",
      tag: "test-notification",
    };

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          JSON.stringify(payload),
        );
        sent++;
      } catch (error) {
        failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(
          `Endpoint ${subscription.endpoint.substring(0, 50)}...: ${errorMessage}`,
        );
        console.error("Push notification error:", error);

        // サブスクリプションが無効な場合は削除
        if (errorMessage.includes("410") || errorMessage.includes("404")) {
          await ctx.runMutation(api.push.mutations.unsubscribe, {
            endpoint: subscription.endpoint,
          });
        }
      }
    }

    return {
      success: sent > 0,
      message: `${sent}件送信、${failed}件失敗`,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * 特定のユーザーにプッシュ通知を送信
 */
export const sendToUser = action({
  args: {
    userId: v.string(),
    payload: pushPayloadValidator,
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("認証が必要です");
    }

    // 対象ユーザーのサブスクリプションを取得
    const subscriptions = await ctx.runQuery(api.push.queries.list, {});

    if (subscriptions.length === 0) {
      return {
        success: false,
        message: "サブスクリプションが見つかりませんでした",
        sent: 0,
      };
    }

    let sent = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          JSON.stringify(args.payload),
        );
        sent++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(`Failed to send: ${errorMessage}`);
        console.error("Push notification error:", error);

        // サブスクリプションが無効な場合は削除
        if (errorMessage.includes("410") || errorMessage.includes("404")) {
          await ctx.runMutation(api.push.mutations.unsubscribe, {
            endpoint: subscription.endpoint,
          });
        }
      }
    }

    return {
      success: sent > 0,
      sent,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * グループの全メンバーにプッシュ通知を送信
 */
export const sendToGroup = action({
  args: {
    groupId: v.id("groups"),
    payload: pushPayloadValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    message: string;
    sent: number;
    total?: number;
    memberCount?: number;
    errors?: string[];
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // グループメンバーを取得
    const members = await ctx.runQuery(api.groups.queries.getGroupMembers, {
      groupId: args.groupId,
    });

    if (!members || members.length === 0) {
      return {
        success: false,
        message: "グループメンバーが見つかりませんでした",
        sent: 0,
      };
    }

    // 各メンバーのサブスクリプションを取得して通知送信
    let sent = 0;
    let totalSubscriptions = 0;
    const errors: string[] = [];

    for (const member of members) {
      const subscriptions = await ctx.runQuery(
        internal.push.queries.listByUserId,
        {
          userId: member.userId,
        },
      );

      totalSubscriptions += subscriptions.length;

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
              },
            },
            JSON.stringify(args.payload),
          );
          sent++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push(`Failed to send: ${errorMessage}`);
          console.error("Push notification error:", error);

          // サブスクリプションが無効な場合は削除
          if (errorMessage.includes("410") || errorMessage.includes("404")) {
            await ctx.runMutation(api.push.mutations.unsubscribe, {
              endpoint: subscription.endpoint,
            });
          }
        }
      }
    }

    return {
      success: sent > 0,
      message: `${sent}/${totalSubscriptions}件送信（メンバー数: ${members.length}）`,
      sent,
      total: totalSubscriptions,
      memberCount: members.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
