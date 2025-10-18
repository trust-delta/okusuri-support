import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * ユーザー表示名を更新
 */
export const updateUserDisplayName = mutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    if (!args.displayName || args.displayName.trim().length === 0) {
      throw new Error("表示名を入力してください");
    }

    if (args.displayName.length > 50) {
      throw new Error("表示名は50文字以内で入力してください");
    }

    // usersテーブルのdisplayNameのみ更新
    await ctx.db.patch(userId, {
      displayName: args.displayName.trim(),
    });

    return { success: true };
  },
});

/**
 * プロフィール画像をURLで更新
 */
export const updateUserImage = mutation({
  args: {
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 画像URLの簡易バリデーション
    if (!args.imageUrl || args.imageUrl.trim().length === 0) {
      throw new Error("画像URLを入力してください");
    }

    // URLの形式チェック（httpまたはhttpsで始まるか、Convex storageのURLか）
    const url = args.imageUrl.trim();
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("/_storage/")
    ) {
      throw new Error("有効な画像URLを入力してください");
    }

    // usersテーブルを更新
    await ctx.db.patch(userId, {
      image: url,
    });

    return { success: true };
  },
});

/**
 * 画像アップロード用のURLを生成
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * アップロードされた画像のストレージIDを使ってプロフィール画像を更新
 */
export const updateUserImageFromStorage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // ストレージIDが有効か確認
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("画像が見つかりません");
    }

    // usersテーブルにストレージIDを保存（URLではなく）
    await ctx.db.patch(userId, {
      customImageStorageId: args.storageId,
    });

    return { success: true, imageUrl };
  },
});
