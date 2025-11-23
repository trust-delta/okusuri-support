import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

/**
 * 服薬リマインダーを手動実行（テスト用）
 *
 * 認証済みユーザーのみが実行可能
 */
export const testMedicationReminders = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 内部actionを呼び出し
    const result = await ctx.runAction(
      internal.scheduler.checkMedicationReminders,
      {},
    );

    return result;
  },
});
