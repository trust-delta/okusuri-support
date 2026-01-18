import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { error, type Result, success } from "../types/result";

/**
 * ファイルアップロード用のURLを生成
 * 認証されたユーザーのみがアップロード可能
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<Result<string>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const url = await ctx.storage.generateUploadUrl();
    return success(url);
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
  handler: async (ctx, args): Promise<Result<Id<"prescriptions">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      return error("処方箋が見つかりません");
    }

    // 論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      return error("削除された処方箋に画像を添付できません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
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

    return success(args.prescriptionId);
  },
});

/**
 * 処方箋から画像を削除
 */
export const removeImageFromPrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args): Promise<Result<null>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      return error("処方箋が見つかりません");
    }

    // 論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      return error("削除された処方箋の画像を操作できません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // 画像がない場合は何もしない
    if (!prescription.imageId) {
      return success(null);
    }

    // ストレージから画像を削除
    await ctx.storage.delete(prescription.imageId);

    // 処方箋のimageIdをクリア
    await ctx.db.patch(args.prescriptionId, {
      imageId: undefined,
      updatedAt: Date.now(),
    });

    return success(null);
  },
});
