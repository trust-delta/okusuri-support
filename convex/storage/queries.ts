import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";

/**
 * 処方箋の画像URLを取得
 */
export const getPrescriptionImageUrl = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      return null;
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      return null;
    }

    // 画像がない場合
    if (!prescription.imageId) {
      return null;
    }

    // 画像URLを取得
    return await ctx.storage.getUrl(prescription.imageId);
  },
});

/**
 * ストレージIDから画像URLを取得（汎用）
 */
export const getImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});
