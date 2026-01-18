import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { error, type Result, success } from "../types/result";

type ValidInvitationResult = {
  valid: true;
  invitation: {
    groupId: Doc<"groups">["_id"];
    groupName: string;
    groupDescription: string | undefined;
    memberCount: number;
    allowedRoles: Doc<"groupInvitations">["allowedRoles"];
    expiresAt: number;
  };
};

type InvalidInvitationResult = {
  valid: false;
  error: string;
};

type InvitationValidationResult =
  | ValidInvitationResult
  | InvalidInvitationResult;

type InvitationListItem = {
  _id: Doc<"groupInvitations">["_id"];
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  allowedRoles: Doc<"groupInvitations">["allowedRoles"];
  isUsed: boolean;
  usedBy: string | undefined;
  usedAt: number | undefined;
  invitationLink: string;
};

/**
 * 招待コードを検証してグループ情報を返す
 *
 * @security 認証不要（意図的）
 * この関数は招待リンク（/invite/[code]）ページで使用され、
 * ユーザーがログイン前にグループ情報を確認できるようにする。
 * 返却する情報はグループ名、説明、メンバー数のみで機密情報を含まない。
 * 参照: .context/specs/features/group.md - 招待コード検証
 */
export const validateInvitationCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args): Promise<InvitationValidationResult> => {
    // 1. 招待コードでレコード取得
    const invitation = await ctx.db
      .query("groupInvitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!invitation) {
      return {
        valid: false,
        error: "招待コードが無効です",
      };
    }

    // 2. 有効期限チェック
    const now = Date.now();
    if (invitation.expiresAt < now) {
      return {
        valid: false,
        error: "招待コードが無効です",
      };
    }

    // 3. 使用済みチェック
    if (invitation.isUsed) {
      return {
        valid: false,
        error: "招待コードが無効です",
      };
    }

    // 4. グループ基本情報取得
    const group = await ctx.db.get(invitation.groupId);
    if (!group) {
      return {
        valid: false,
        error: "招待コードが無効です",
      };
    }

    // 5. グループのメンバー数取得
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", invitation.groupId))
      .collect();

    return {
      valid: true,
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
  handler: async (ctx, args): Promise<Result<InvitationListItem[]>> => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 2. グループメンバーシップ確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // 3. グループの招待一覧取得
    const invitations = await ctx.db
      .query("groupInvitations")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    const result = invitations.map((inv) => {
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

    return success(result);
  },
});
