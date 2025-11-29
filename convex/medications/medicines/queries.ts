import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * 薬の服薬記録件数を取得（削除確認用）
 */
export const getMedicineRecordCount = query({
  args: {
    medicineId: v.id("medicines"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) {
      throw new ConvexError("薬が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), medicine.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // この薬の服薬記録を取得（削除されていないもの）
    const records = await ctx.db
      .query("medicationRecords")
      .filter((q) =>
        q.and(
          q.eq(q.field("medicineId"), args.medicineId),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    return records.length;
  },
});
