import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

/**
 * デフォルトの通知時刻（分単位）
 */
export const DEFAULT_NOTIFICATION_TIMES = {
  morningTime: 480, // 8:00
  noonTime: 720, // 12:00
  eveningTime: 1080, // 18:00
  bedtimeTime: 1260, // 21:00
} as const;

/**
 * 通知時刻設定の型
 */
export type NotificationTimeSettings = {
  morningTime: number;
  noonTime: number;
  eveningTime: number;
  bedtimeTime: number;
};

/**
 * グループの通知時刻設定を取得
 */
export const get = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<NotificationTimeSettings>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // 通知設定を取得
    const settings = await ctx.db
      .query("groupNotificationSettings")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .first();

    // 設定がない場合はデフォルト値を返す
    if (!settings) {
      return success(DEFAULT_NOTIFICATION_TIMES);
    }

    return success({
      morningTime: settings.morningTime,
      noonTime: settings.noonTime,
      eveningTime: settings.eveningTime,
      bedtimeTime: settings.bedtimeTime,
    });
  },
});
