import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * 招待コードを生成
 */
/**
 * 招待コードを生成（内部mutation）
 */
export const createInvitationInternal = mutation({
  args: {
    groupId: v.id("groups"),
    code: v.string(),
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

    // 3. Patient在籍状況確認
    const patientMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .first();

    // 4. 許可ロール決定
    const allowedRoles: ("patient" | "supporter")[] = patientMember
      ? ["supporter"] // Patient存在時はSupporterのみ
      : ["patient", "supporter"]; // Patient不在時は両方

    // 5. コードの一意性確認
    const existing = await ctx.db
      .query("groupInvitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("招待コードが重複しています");
    }

    // 6. 有効期限設定（7日後）
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = now + sevenDaysInMs;

    // 7. 招待レコード挿入
    const invitationId = await ctx.db.insert("groupInvitations", {
      code: args.code,
      groupId: args.groupId,
      createdBy: userId,
      createdAt: now,
      expiresAt,
      allowedRoles,
      isUsed: false,
    });

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${args.code}`;

    return {
      invitationId,
      code: args.code,
      expiresAt,
      allowedRoles,
      invitationLink,
    };
  },
});

export const createInvitation = action({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<{
    invitationId: any;
    code: string;
    expiresAt: number;
    allowedRoles: ("patient" | "supporter")[];
    invitationLink: string;
  }> => {
    // 最大3回試行
    const maxAttempts = 3;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. 暗号学的に安全な招待コード生成
      const code: string = await ctx.runAction(api.invitationCodeGenerator.generateInvitationCodeAction);
      
      try {
        // 2. 招待レコード作成
        const result = await ctx.runMutation(api.invitations.createInvitationInternal, {
          groupId: args.groupId,
          code,
        });
        
        return result;
      } catch (error) {
        // コード重複の場合は再試行
        if (error instanceof Error && error.message.includes("重複")) {
          continue;
        }
        throw error;
      }
    }
    
    throw new Error("招待コードの生成に失敗しました。3回試行しても一意なコードを生成できませんでした。");
  },
});;;

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
