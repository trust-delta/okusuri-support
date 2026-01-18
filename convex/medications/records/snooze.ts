import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

/**
 * 最大スヌーズ回数
 */
export const MAX_SNOOZE_COUNT = 3;

/**
 * 許可されたスヌーズ時間（分）
 */
export const ALLOWED_SNOOZE_MINUTES = [5, 10, 15, 30] as const;
export type SnoozeMinutes = (typeof ALLOWED_SNOOZE_MINUTES)[number];

/**
 * 服薬記録をスヌーズ
 */
export const snoozeRecord = mutation({
  args: {
    recordId: v.id("medicationRecords"),
    minutes: v.union(v.literal(5), v.literal(10), v.literal(15), v.literal(30)),
  },
  handler: async (ctx, args): Promise<Result<{ snoozedUntil: number }>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 記録を取得
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      return error("記録が見つかりません");
    }

    // 削除済みチェック
    if (record.deletedAt !== undefined) {
      return error("この記録は削除されています");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), record.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // pending状態のみスヌーズ可能
    if (record.status !== "pending") {
      return error("未服用の記録のみスヌーズできます");
    }

    // スヌーズ回数チェック
    const currentSnoozeCount = record.snoozeCount ?? 0;
    if (currentSnoozeCount >= MAX_SNOOZE_COUNT) {
      return error(`スヌーズは最大${MAX_SNOOZE_COUNT}回までです`);
    }

    const now = Date.now();
    const snoozedUntil = now + args.minutes * 60 * 1000;

    // スヌーズ設定を更新
    await ctx.db.patch(args.recordId, {
      snoozedUntil,
      snoozeCount: currentSnoozeCount + 1,
      lastSnoozedAt: now,
      updatedAt: now,
    });

    return success({ snoozedUntil });
  },
});

/**
 * スヌーズをキャンセル
 */
export const cancelSnooze = mutation({
  args: {
    recordId: v.id("medicationRecords"),
  },
  handler: async (ctx, args): Promise<Result<void>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 記録を取得
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      return error("記録が見つかりません");
    }

    // 削除済みチェック
    if (record.deletedAt !== undefined) {
      return error("この記録は削除されています");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), record.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // スヌーズ中でない場合はエラー
    if (!record.snoozedUntil) {
      return error("この記録はスヌーズされていません");
    }

    const now = Date.now();

    // スヌーズをキャンセル（snoozedUntilをクリア、snoozeCountは維持）
    await ctx.db.patch(args.recordId, {
      snoozedUntil: undefined,
      updatedAt: now,
    });

    return success(undefined);
  },
});
