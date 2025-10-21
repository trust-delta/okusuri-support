import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { error, type Result, success } from "../shared/types/result";

/**
 * 新しいグループを作成
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    creatorRole: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args): Promise<Result<Id<"groups">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
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

    // アクティブグループとして設定
    await ctx.db.patch(userId, { activeGroupId: groupId });

    return success(groupId);
  },
});

/**
 * オンボーディング完了とグループ作成を同時実行
 */
export const completeOnboardingWithNewGroup = mutation({
  args: {
    userName: v.string(),
    groupName: v.string(),
    groupDescription: v.optional(v.string()),
    role: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args): Promise<Result<{ groupId: Id<"groups"> }>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // ユーザー表示名をusersテーブルに保存
    await ctx.db.patch(userId, {
      displayName: args.userName,
    });

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

    // アクティブグループとして設定
    await ctx.db.patch(userId, { activeGroupId: groupId });

    return success({ groupId });
  },
});

/**
 * 既存のグループに参加
 */
export const joinGroup = mutation({
  args: {
    groupId: v.id("groups"),
    role: v.union(v.literal("patient"), v.literal("supporter")),
  },
  handler: async (ctx, args): Promise<Result<Id<"groupMembers">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 既に参加済みかチェック
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (existing) {
      return error("既にグループに参加しています");
    }

    // グループに参加
    const membershipId = await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId,
      role: args.role,
      joinedAt: Date.now(),
    });

    return success(membershipId);
  },
});

/**
 * 招待コードを使用してグループに参加
 */
export const joinGroupWithInvitation = mutation({
  args: {
    invitationCode: v.string(),
    role: v.union(v.literal("patient"), v.literal("supporter")),
    displayName: v.optional(v.string()), // オプショナル: 既存ユーザーは省略可
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Result<{
      groupId: Id<"groups">;
      membershipId: Id<"groupMembers">;
    }>
  > => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 2. ユーザー情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      return error("ユーザーが見つかりません");
    }

    // 3. 表示名の決定と検証
    let displayName = user.displayName || args.displayName;

    if (!displayName || displayName.trim().length === 0) {
      return error("表示名を入力してください");
    }

    displayName = displayName.trim();

    if (displayName.length > 50) {
      return error("表示名は50文字以内で入力してください");
    }

    // 表示名がusersテーブルにない場合は設定
    if (!user.displayName) {
      await ctx.db.patch(userId, {
        displayName,
      });
    }

    // 4. 招待コード検証
    const invitation = await ctx.db
      .query("groupInvitations")
      .withIndex("by_code", (q) => q.eq("code", args.invitationCode))
      .first();

    if (!invitation) {
      return error("招待コードが無効です");
    }

    // 有効期限チェック
    const now = Date.now();
    if (invitation.expiresAt < now) {
      return error("招待コードが無効です");
    }

    // 使用済みチェック
    if (invitation.isUsed) {
      return error("招待コードが無効です");
    }

    // 許可ロールチェック
    if (!invitation.allowedRoles.includes(args.role)) {
      return error(
        `この招待では${invitation.allowedRoles.join("、")}として参加できます`,
      );
    }

    // 5. 既存メンバーシップ確認(重複参加防止)
    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), invitation.groupId))
      .first();

    if (existingMembership) {
      return error("既にこのグループのメンバーです");
    }

    // 6. Patientロール時の既存Patient確認
    if (args.role === "patient") {
      const existingPatient = await ctx.db
        .query("groupMembers")
        .withIndex("by_groupId", (q) => q.eq("groupId", invitation.groupId))
        .filter((q) => q.eq(q.field("role"), "patient"))
        .first();

      if (existingPatient) {
        return error("このグループには既に患者が登録されています");
      }
    }

    // 7. グループメンバーシップ作成（displayNameは保存しない）
    const membershipId = await ctx.db.insert("groupMembers", {
      groupId: invitation.groupId,
      userId,
      role: args.role,
      joinedAt: now,
    });

    // 8. 招待を使用済みに更新
    await ctx.db.patch(invitation._id, {
      isUsed: true,
      usedBy: userId,
      usedAt: now,
    });

    // 9. アクティブグループとして設定
    await ctx.db.patch(userId, { activeGroupId: invitation.groupId });

    return success({
      groupId: invitation.groupId,
      membershipId,
    });
  },
});
