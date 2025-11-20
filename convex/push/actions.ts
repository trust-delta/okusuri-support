import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import webpush from "web-push";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

// VAPID設定
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = "mailto:support@okusuri-support.example.com";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("⚠️ VAPID keys are not configured. Push notifications will not work.");
}

// web-pushの設定
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * プッシュ通知ペイロード
 */
const pushPayloadValidator = v.object({
  title: v.string(),
  body: v.string(),
  icon: v.optional(v.string()),
  badge: v.optional(v.string()),
  tag: v.optional(v.string()),
  data: v.optional(v.any()),
});

/**
 * テスト通知を送信
 */
export const sendTestNotification = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
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
          JSON.stringify(payload)
        );
        sent++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Endpoint ${subscription.endpoint.substring(0, 50)}...: ${errorMessage}`);
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
      throw new Error("認証が必要です");
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
          JSON.stringify(args.payload)
        );
        sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループのサブスクリプションを取得
    // listByGroup内でメンバーシップチェックが行われる
    const subscriptions = await ctx.runQuery(api.push.queries.listByGroup, {
      groupId: args.groupId,
    });

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
          JSON.stringify(args.payload)
        );
        sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
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
      message: `${sent}/${subscriptions.length}件送信`,
      sent,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
