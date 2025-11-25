import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

/**
 * 服薬リマインダーを手動実行（テスト用）
 *
 * 認証済みユーザーのみが実行可能
 */
export const testMedicationReminders = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    sent: number;
    checked?: number;
    errors?: string[];
    message: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // 内部actionを呼び出し
    const result = await ctx.runAction(
      internal.scheduler.checkMedicationReminders,
      {},
    );

    return result;
  },
});
