import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    auth0Id: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getOnboardingStatus = query({
  args: { auth0Id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      return { isOnboarded: false, reason: "user_not_found" };
    }

    const membership = await ctx.db
      .query("groupMembers")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (!membership) {
      return { isOnboarded: false, reason: "no_group" };
    }

    return { isOnboarded: true };
  },
});

export const getUserGroups = query({
  args: { auth0Id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) return [];

    const memberships = await ctx.db
      .query("groupMembers")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // グループ詳細を取得
    return Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        return { ...group, role: membership.role };
      })
    );
  },
});


export const updateUserName = mutation({
  args: {
    auth0Id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", (q) => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
    });

    return { success: true };
  },
});
