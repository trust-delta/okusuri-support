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

    // usersテーブルから基本情報を取得
    const user = await ctx.db.get(userId);

    // カスタム画像がある場合はURLを生成、なければOAuth画像を使用
    let imageUrl = user?.image;
    if (user?.customImageStorageId) {
      const customImageUrl = await ctx.storage.getUrl(
        user.customImageStorageId,
      );
      if (customImageUrl) {
        imageUrl = customImageUrl;
      }
    }

    return {
      userId,
      displayName: user?.displayName,
      image: imageUrl,
      name: user?.name,
      email: user?.email,
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

    // 各メンバーのusersテーブルから表示名とプロフィール画像を取得
    const membersWithInfo = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), member.userId))
          .first();

        // カスタム画像がある場合はURLを生成、なければOAuth画像を使用
        let imageUrl = user?.image;
        if (user?.customImageStorageId) {
          const customImageUrl = await ctx.storage.getUrl(
            user.customImageStorageId,
          );
          if (customImageUrl) {
            imageUrl = customImageUrl;
          }
        }

        return {
          userId: member.userId,
          displayName: user?.displayName,
          role: member.role,
          joinedAt: member.joinedAt,
          image: imageUrl,
          name: user?.name,
          email: user?.email,
        };
      }),
    );

    return membersWithInfo;
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

    // usersテーブルのdisplayNameのみ更新
    await ctx.db.patch(userId, {
      displayName: args.displayName.trim(),
    });

    return { success: true };
  },
});

/**
 * プロフィール画像を更新
 */
export const updateUserImage = mutation({
  args: {
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // 画像URLの簡易バリデーション
    if (!args.imageUrl || args.imageUrl.trim().length === 0) {
      throw new Error("画像URLを入力してください");
    }

    // URLの形式チェック（httpまたはhttpsで始まるか、Convex storageのURLか）
    const url = args.imageUrl.trim();
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("/_storage/")
    ) {
      throw new Error("有効な画像URLを入力してください");
    }

    // usersテーブルを更新
    await ctx.db.patch(userId, {
      image: url,
    });

    return { success: true };
  },
});

/**
 * 画像アップロード用のURLを生成
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * アップロードされた画像のストレージIDを使ってプロフィール画像を更新
 */
export const updateUserImageFromStorage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // ストレージIDが有効か確認
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("画像が見つかりません");
    }

    // usersテーブルにストレージIDを保存（URLではなく）
    await ctx.db.patch(userId, {
      customImageStorageId: args.storageId,
    });

    return { success: true, imageUrl };
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
