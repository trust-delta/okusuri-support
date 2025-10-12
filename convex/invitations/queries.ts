import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * 招待コードを検証してグループ情報を返す
 */
export const validateInvitationCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 招待コードでレコード取得
    const invitation = await ctx.db
      .query("groupInvitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!invitation) {
      return {
        valid: false as const,
        error: "招待コードが無効です",
      };
    }

    // 2. 有効期限チェック
    const now = Date.now();
    if (invitation.expiresAt < now) {
      return {
        valid: false as const,
        error: "招待コードが無効です",
      };
    }

    // 3. 使用済みチェック
    if (invitation.isUsed) {
      return {
        valid: false as const,
        error: "招待コードが無効です",
      };
    }

    // 4. グループ基本情報取得
    const group = await ctx.db.get(invitation.groupId);
    if (!group) {
      return {
        valid: false as const,
        error: "招待コードが無効です",
      };
    }

    // 5. グループのメンバー数取得
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", invitation.groupId))
      .collect();

    return {
      valid: true as const,
      invitation: {
        groupId: invitation.groupId,
        groupName: group.name,
        groupDescription: group.description,
        memberCount: members.length,
        allowedRoles: invitation.allowedRoles,
        expiresAt: invitation.expiresAt,
      },
    };
  },
});

/**
 * グループの招待一覧を取得
 */
export const listGroupInvitations = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 2. グループメンバーシップ確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // 3. グループの招待一覧取得
    const invitations = await ctx.db
      .query("groupInvitations")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    return invitations.map((inv) => {
      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${inv.code}`;

      return {
        _id: inv._id,
        code: inv.code,
        createdBy: inv.createdBy,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        allowedRoles: inv.allowedRoles,
        isUsed: inv.isUsed,
        usedBy: inv.usedBy,
        usedAt: inv.usedAt,
        invitationLink,
      };
    });
  },
});
