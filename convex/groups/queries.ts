import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";

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

    // ユーザー情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // アクティブなメンバーシップのみ取得（leftAt が undefined）
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .collect();

    if (memberships.length === 0) {
      return { hasGroup: false, groups: [] };
    }

    // グループ詳細を取得（削除されていないグループのみ）
    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        // 削除されたグループは除外
        if (!group || group.deletedAt !== undefined) {
          return null;
        }
        return {
          groupId: membership.groupId,
          groupName: group.name,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      }),
    );

    // nullを除外
    const validGroups = groups.filter((g) => g !== null);

    return {
      hasGroup: validGroups.length > 0,
      groups: validGroups,
      activeGroupId: user.activeGroupId,
    };
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
      return null; // エラーをスローせず null を返す
    }

    // グループが存在し、削除されていないことを確認
    const group = await ctx.db.get(args.groupId);
    if (!group || group.deletedAt !== undefined) {
      return null; // 削除済みグループは null を返す
    }

    // 自分がそのグループのアクティブメンバーであることを確認
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!myMembership) {
      return null; // エラーをスローせず null を返す
    }

    // グループの全アクティブメンバーを取得（leftAt が undefined のみ）
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
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

/**
 * グループ詳細を取得
 * 削除済みグループの場合は null を返す（エラーをスローしない）
 */
export const getGroupDetails = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // グループを取得
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      return null;
    }

    // 削除済みグループは null を返す（エラーをスローしない）
    if (group.deletedAt !== undefined) {
      return null;
    }

    // 自分がそのグループのアクティブメンバーであることを確認
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!myMembership) {
      return null;
    }

    // グループの全アクティブメンバー数を取得
    const activeMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .collect();

    return {
      _id: group._id,
      name: group.name,
      description: group.description,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      myRole: myMembership.role,
      memberCount: activeMembers.length,
      isLastMember: activeMembers.length === 1,
    };
  },
});
