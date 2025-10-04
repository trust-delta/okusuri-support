import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    creatorAuth0Id: v.string(),
    creatorRole: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    // ユーザーを取得
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.creatorAuth0Id))
      .first();

    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    // グループを作成
    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // 作成者をメンバーとして追加
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role: args.creatorRole,
      joinedAt: Date.now(),
    });

    return groupId;
  },
});

export const completeOnboardingWithNewGroup = mutation({
  args: {
    auth0Id: v.string(),
    email: v.string(),
    userName: v.string(),
    groupName: v.string(),
    groupDescription: v.optional(v.string()),
    role: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    // ユーザーを取得または作成
    let user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      // ユーザーが存在しない場合は作成
      const userId = await ctx.db.insert("users", {
        auth0Id: args.auth0Id,
        email: args.email,
        name: args.userName,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
      if (!user) {
        throw new Error("ユーザーの作成に失敗しました");
      }
    } else {
      // 既存ユーザーの名前を更新
      await ctx.db.patch(user._id, {
        name: args.userName,
      });
    }

    // グループを作成
    const groupId = await ctx.db.insert("groups", {
      name: args.groupName,
      description: args.groupDescription,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // グループに参加
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role: args.role,
      joinedAt: Date.now(),
    });

    return { success: true, groupId };
  },
});

export const joinGroup = mutation({
  args: {
    groupId: v.id("groups"),
    auth0Id: v.string(),
    role: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args) => {
    // ユーザーを取得
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    // 既に参加済みかチェック
    const existing = await ctx.db
      .query("groupMembers")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existing) {
      throw new Error("既にグループに参加しています");
    }

    // グループに参加
    return await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId: user._id,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});

export const getGroupMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("groupMembers")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .collect();

    // ユーザー情報を取得
    return Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          userId: membership.userId,
          role: membership.role,
          joinedAt: membership.joinedAt,
          name: user?.name,
          email: user?.email,
        };
      }),
    );
  },
});

export const getUserGroupStatus = query({
  args: { auth0Id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      return { hasGroup: false, groups: [] };
    }

    const memberships = await ctx.db
      .query("groupMembers")
      .filter((q) => q.eq(q.field("userId"), user._id))
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
