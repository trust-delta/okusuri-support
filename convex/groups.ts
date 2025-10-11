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

    return members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      joinedAt: member.joinedAt,
    }));
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


/**
 * 招待コードを使用してグループに参加
 */
export const joinGroupWithInvitation = mutation({
  args: {
    invitationCode: v.string(),
    role: v.union(v.literal("patient"), v.literal("supporter")),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 2. 表示名バリデーション
    if (!args.displayName || args.displayName.trim().length === 0) {
      throw new Error("表示名を入力してください");
    }
    if (args.displayName.length > 50) {
      throw new Error("表示名は50文字以内で入力してください");
    }

    // 3. 招待コード検証
    const invitation = await ctx.db
      .query("groupInvitations")
      .withIndex("by_code", (q) => q.eq("code", args.invitationCode))
      .first();

    if (!invitation) {
      throw new Error("招待コードが無効です");
    }

    // 有効期限チェック
    const now = Date.now();
    if (invitation.expiresAt < now) {
      throw new Error("招待コードが無効です");
    }

    // 使用済みチェック
    if (invitation.isUsed) {
      throw new Error("招待コードが無効です");
    }

    // 許可ロールチェック
    if (!invitation.allowedRoles.includes(args.role)) {
      throw new Error(`この招待では${invitation.allowedRoles.join("、")}として参加できます`);
    }

    // 4. 既存メンバーシップ確認（重複参加防止）
    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), invitation.groupId))
      .first();

    if (existingMembership) {
      throw new Error("既にこのグループのメンバーです");
    }

    // 5. Patientロール時の既存Patient確認
    if (args.role === "patient") {
      const existingPatient = await ctx.db
        .query("groupMembers")
        .withIndex("by_groupId", (q) => q.eq("groupId", invitation.groupId))
        .filter((q) => q.eq(q.field("role"), "patient"))
        .first();

      if (existingPatient) {
        throw new Error("このグループには既に患者が登録されています");
      }
    }

    // 6. グループメンバーシップ作成
    const membershipId = await ctx.db.insert("groupMembers", {
      groupId: invitation.groupId,
      userId,
      displayName: args.displayName.trim(),
      role: args.role,
      joinedAt: now,
    });

    // 7. 招待を使用済みに更新
    await ctx.db.patch(invitation._id, {
      isUsed: true,
      usedBy: userId,
      usedAt: now,
    });

    return {
      success: true,
      groupId: invitation.groupId,
      membershipId,
    };
  },
});
