import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    creatorRole: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    // Convex Authで認証されたユーザーを取得
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

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
    // Convex Authで認証されたユーザーを取得
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

    // グループを作成
    const groupId = await ctx.db.insert("groups", {
      name: args.groupName,
      description: args.groupDescription,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // グループに参加
    await ctx.db.insert("groupMembers", {
      groupId,
      userId,
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
    // Convex Authで認証されたユーザーを取得
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

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
    // 認証確認
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

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
    // Convex Authで認証されたユーザーを取得
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { hasGroup: false, groups: [] };
    }

    const userId = identity.subject;

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
