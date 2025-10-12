import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * 新しいグループを作成
 */
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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
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

    return { success: true, groupId };
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

/**
 * 招待コードを使用してグループに参加
 */
export const joinGroupWithInvitation = mutation({
  args: {
    invitationCode: v.string(),
    role: v.union(v.literal("patient"), v.literal("supporter")),
    displayName: v.optional(v.string()), // オプショナル: 既存ユーザーは省略可
  },
  handler: async (ctx, args) => {
    // 1. 認証確認
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 2. ユーザー情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    // 3. 表示名の決定と検証
    let displayName = user.displayName || args.displayName;

    if (!displayName || displayName.trim().length === 0) {
      throw new Error("表示名を入力してください");
    }

    displayName = displayName.trim();

    if (displayName.length > 50) {
      throw new Error("表示名は50文字以内で入力してください");
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
      throw new Error(
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
      throw new Error("既にこのグループのメンバーです");
    }

    // 6. Patientロール時の既存Patient確認
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

    return {
      success: true,
      groupId: invitation.groupId,
      membershipId,
    };
  },
});
