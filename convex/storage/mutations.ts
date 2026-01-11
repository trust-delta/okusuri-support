import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * ファイルアップロード用のURLを生成
 * 認証されたユーザーのみがアップロード可能
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * 処方箋に画像を添付
 */
export const attachImageToPrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // 論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      throw new ConvexError("削除された処方箋に画像を添付できません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // 既存の画像があれば削除
    if (prescription.imageId) {
      await ctx.storage.delete(prescription.imageId);
    }

    // 新しい画像を設定
    await ctx.db.patch(args.prescriptionId, {
      imageId: args.storageId,
      updatedAt: Date.now(),
    });

    return args.prescriptionId;
  },
});

/**
 * 処方箋から画像を削除
 */
export const removeImageFromPrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // 論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      throw new ConvexError("削除された処方箋の画像を操作できません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // 画像がない場合は何もしない
    if (!prescription.imageId) {
      return;
    }

    // ストレージから画像を削除
    await ctx.storage.delete(prescription.imageId);

    // 処方箋のimageIdをクリア
    await ctx.db.patch(args.prescriptionId, {
      imageId: undefined,
      updatedAt: Date.now(),
    });
  },
});
