import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";
import { DEFAULT_NOTIFICATION_TIMES } from "./queries";

/**
 * 分単位の時刻をバリデート（0〜1439）
 */
const isValidTimeInMinutes = (time: number): boolean => {
  return Number.isInteger(time) && time >= 0 && time < 1440;
};

/**
 * グループの通知時刻設定を更新
 */
export const update = mutation({
  args: {
    groupId: v.id("groups"),
    morningTime: v.optional(v.number()),
    noonTime: v.optional(v.number()),
    eveningTime: v.optional(v.number()),
    bedtimeTime: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Result<void>> => {
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

    // 時刻のバリデーション
    if (
      args.morningTime !== undefined &&
      !isValidTimeInMinutes(args.morningTime)
    ) {
      return error("朝の時刻が無効です（0〜1439分）");
    }
    if (args.noonTime !== undefined && !isValidTimeInMinutes(args.noonTime)) {
      return error("昼の時刻が無効です（0〜1439分）");
    }
    if (
      args.eveningTime !== undefined &&
      !isValidTimeInMinutes(args.eveningTime)
    ) {
      return error("夕方の時刻が無効です（0〜1439分）");
    }
    if (
      args.bedtimeTime !== undefined &&
      !isValidTimeInMinutes(args.bedtimeTime)
    ) {
      return error("就寝前の時刻が無効です（0〜1439分）");
    }

    // 既存の設定を取得
    const existingSettings = await ctx.db
      .query("groupNotificationSettings")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      // 既存設定を更新
      await ctx.db.patch(existingSettings._id, {
        ...(args.morningTime !== undefined && {
          morningTime: args.morningTime,
        }),
        ...(args.noonTime !== undefined && { noonTime: args.noonTime }),
        ...(args.eveningTime !== undefined && {
          eveningTime: args.eveningTime,
        }),
        ...(args.bedtimeTime !== undefined && {
          bedtimeTime: args.bedtimeTime,
        }),
        updatedAt: now,
      });
    } else {
      // 新規作成（指定されていない値はデフォルト値を使用）
      await ctx.db.insert("groupNotificationSettings", {
        groupId: args.groupId,
        morningTime: args.morningTime ?? DEFAULT_NOTIFICATION_TIMES.morningTime,
        noonTime: args.noonTime ?? DEFAULT_NOTIFICATION_TIMES.noonTime,
        eveningTime: args.eveningTime ?? DEFAULT_NOTIFICATION_TIMES.eveningTime,
        bedtimeTime: args.bedtimeTime ?? DEFAULT_NOTIFICATION_TIMES.bedtimeTime,
        createdAt: now,
        updatedAt: now,
      });
    }

    return success(undefined);
  },
});

/**
 * グループ作成時にデフォルトの通知設定を作成（内部用）
 */
export const createDefault = internalMutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Id<"groupNotificationSettings">> => {
    const now = Date.now();

    return await ctx.db.insert("groupNotificationSettings", {
      groupId: args.groupId,
      morningTime: DEFAULT_NOTIFICATION_TIMES.morningTime,
      noonTime: DEFAULT_NOTIFICATION_TIMES.noonTime,
      eveningTime: DEFAULT_NOTIFICATION_TIMES.eveningTime,
      bedtimeTime: DEFAULT_NOTIFICATION_TIMES.bedtimeTime,
      createdAt: now,
      updatedAt: now,
    });
  },
});
