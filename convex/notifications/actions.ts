import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { error, type Result, success } from "../types/result";

type ReminderResult = {
  sent: number;
  checked?: number;
  errors?: string[];
  message: string;
};

/**
 * 服薬リマインダーを手動実行（テスト用）
 *
 * 認証済みユーザーのみが実行可能
 */
export const testMedicationReminders = action({
  args: {},
  handler: async (ctx): Promise<Result<ReminderResult>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 内部actionを呼び出し
    const result = await ctx.runAction(
      // @ts-expect-error Convex型インスタンス化の深度制限を回避
      internal.scheduler.checkMedicationReminders,
      {},
    );

    return success(result);
  },
});
