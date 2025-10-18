import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";

/**
 * 現在のユーザー情報を取得
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // usersテーブルから基本情報を取得
    const user = await ctx.db.get(userId);

    // カスタム画像がある場合はURLを生成、なければOAuth画像を使用
    let imageUrl = user?.image;
    if (user?.customImageStorageId) {
      const customImageUrl = await ctx.storage.getUrl(
        user.customImageStorageId,
      );
      if (customImageUrl) {
        imageUrl = customImageUrl;
      }
    }

    return {
      userId,
      displayName: user?.displayName,
      image: imageUrl,
      name: user?.name,
      email: user?.email,
    };
  },
});
