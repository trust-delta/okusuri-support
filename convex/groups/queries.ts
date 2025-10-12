import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
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

/**
 * ユーザーのグループ参加状況を取得
 */
export const getUserGroupStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (memberships.length === 0) {
      return { hasGroup: false, groups: [] };
    }

    // グループ詳細を取得
    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        return {
          groupId: membership.groupId,
          groupName: group?.name,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      }),
    );

    return { hasGroup: true, groups };
  },
});

/**
 * グループのメンバー一覧を取得
 */
export const getGroupMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証されていません");
    }

    // 自分がそのグループのメンバーであることを確認
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!myMembership) {
      throw new Error("このグループのメンバーではありません");
    }

    // グループの全メンバーを取得
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    // 各メンバーのusersテーブルから表示名とプロフィール画像を取得
    const membersWithInfo = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), member.userId))
          .first();

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
          userId: member.userId,
          displayName: user?.displayName,
          role: member.role,
          joinedAt: member.joinedAt,
          image: imageUrl,
          name: user?.name,
          email: user?.email,
        };
      }),
    );

    return membersWithInfo;
  },
});
