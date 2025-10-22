import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { error, type Result, success } from "../types/result";

/**
 * ユーザー表示名を更新
 */
export const updateUserDisplayName = mutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    if (!args.displayName || args.displayName.trim().length === 0) {
      return error("表示名を入力してください");
    }

    if (args.displayName.length > 50) {
      return error("表示名は50文字以内で入力してください");
    }

    // usersテーブルのdisplayNameのみ更新
    await ctx.db.patch(userId, {
      displayName: args.displayName.trim(),
    });

    return success({});
  },
});

/**
 * プロフィール画像をURLで更新
 */
export const updateUserImage = mutation({
  args: {
    imageUrl: v.string(),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 画像URLの簡易バリデーション
    if (!args.imageUrl || args.imageUrl.trim().length === 0) {
      return error("画像URLを入力してください");
    }

    // URLの形式チェック（httpまたはhttpsで始まるか、Convex storageのURLか）
    const url = args.imageUrl.trim();
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("/_storage/")
    ) {
      return error("有効な画像URLを入力してください");
    }

    // usersテーブルを更新
    await ctx.db.patch(userId, {
      image: url,
    });

    return success({});
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
  handler: async (ctx, args): Promise<Result<{ imageUrl: string }>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // ストレージIDが有効か確認
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      return error("画像が見つかりません");
    }

    // usersテーブルにストレージIDを保存（URLではなく）
    await ctx.db.patch(userId, {
      customImageStorageId: args.storageId,
    });

    return success({ imageUrl });
  },
});

/**
 * アクティブなグループを設定
 */
export const setActiveGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // メンバーシップ確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    await ctx.db.patch(userId, { activeGroupId: args.groupId });

    return success({});
  },
});
