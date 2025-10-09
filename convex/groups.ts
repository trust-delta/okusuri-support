import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    creatorRole: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループを作成
    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // 作成者をメンバーとして追加
    await ctx.db.insert("groupMembers", {
      groupId,
      userId,
      role: args.creatorRole,
      joinedAt: Date.now(),
    });

    return groupId;
  },
});

export const completeOnboardingWithNewGroup = mutation({
  args: {
    userName: v.string(),
    groupName: v.string(),
    groupDescription: v.optional(v.string()),
    role: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループを作成
    const groupId = await ctx.db.insert("groups", {
      name: args.groupName,
      description: args.groupDescription,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // グループに参加（表示名も保存）
    await ctx.db.insert("groupMembers", {
      groupId,
      userId,
      displayName: args.userName,
      role: args.role,
      joinedAt: Date.now(),
    });

    return { success: true, groupId };
  },
});

export const joinGroup = mutation({
  args: {
    groupId: v.id("groups"),
    role: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 既に参加済みかチェック
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (existing) {
      throw new Error("既にグループに参加しています");
    }

    // グループに参加
    return await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});

export const getGroupMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Convex Authのユーザー情報を取得
    return Promise.all(
      memberships.map(async (membership) => {
        return {
          userId: membership.userId,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      }),
    );
  },
});

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


export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // ユーザーのグループメンバーシップから表示名を取得
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return {
      userId,
      displayName: membership?.displayName,
    };
  },
});

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

    // ユーザーの全てのグループメンバーシップを更新
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (memberships.length === 0) {
      throw new Error("グループに参加していません");
    }

    // 全てのメンバーシップの表示名を更新
    await Promise.all(
      memberships.map((membership) =>
        ctx.db.patch(membership._id, {
          displayName: args.displayName.trim(),
        }),
      ),
    );

    return { success: true };
  },
});
