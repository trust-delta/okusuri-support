import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { DEFAULT_NOTIFICATION_TIMES } from "./queries";

/**
 * デフォルトの通知時刻設定を作成
 * グループ作成時に自動的に呼び出される
 */
export async function createDefaultNotificationSettings(
  ctx: MutationCtx,
  groupId: Id<"groups">,
): Promise<Id<"groupNotificationSettings">> {
  const now = Date.now();

  return await ctx.db.insert("groupNotificationSettings", {
    groupId,
    morningTime: DEFAULT_NOTIFICATION_TIMES.morningTime,
    noonTime: DEFAULT_NOTIFICATION_TIMES.noonTime,
    eveningTime: DEFAULT_NOTIFICATION_TIMES.eveningTime,
    bedtimeTime: DEFAULT_NOTIFICATION_TIMES.bedtimeTime,
    createdAt: now,
    updatedAt: now,
  });
}
