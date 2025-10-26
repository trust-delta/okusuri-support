import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { createDefaultPrescription } from "../medications/prescriptions/helpers";
import { error, type Result, success } from "../types/result";

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

    // デフォルト処方箋を作成
    await createDefaultPrescription(ctx, groupId, userId);

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

    // デフォルト処方箋を作成
    await createDefaultPrescription(ctx, groupId, userId);

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

    // 既にアクティブメンバーかチェック（leftAt が undefined）
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
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

    // 5. 既存メンバーシップ確認（再参加の可能性も考慮）
    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), invitation.groupId))
      .first();

    // 既存メンバーシップがあり、かつアクティブ（leftAt が undefined）の場合はエラー
    if (existingMembership && existingMembership.leftAt === undefined) {
      return error("既にこのグループのメンバーです");
    }

    // 6. Patientロール時の既存Patient確認（アクティブなPatientのみ）
    if (args.role === "patient") {
      const existingPatient = await ctx.db
        .query("groupMembers")
        .withIndex("by_groupId", (q) => q.eq("groupId", invitation.groupId))
        .filter((q) => q.eq(q.field("role"), "patient"))
        .filter((q) => q.eq(q.field("leftAt"), undefined))
        .first();

      if (existingPatient) {
        return error("このグループには既に患者が登録されています");
      }
    }

    // 7. 既存メンバーシップがある場合は復元、ない場合は新規作成
    let membershipId: Id<"groupMembers">;
    if (existingMembership && existingMembership.leftAt !== undefined) {
      // 再参加: leftAt と leftBy を削除して復元
      await ctx.db.patch(existingMembership._id, {
        leftAt: undefined,
        leftBy: undefined,
        role: args.role, // ロールは新しく選択したものに更新
        // joinedAt は元の値を保持（初回参加日時）
      });
      membershipId = existingMembership._id;
    } else {
      // 新規参加: グループメンバーシップ作成
      membershipId = await ctx.db.insert("groupMembers", {
        groupId: invitation.groupId,
        userId,
        role: args.role,
        joinedAt: now,
      });
    }

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

/**
 * グループから脱退
 */
export const leaveGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<void>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // ユーザー情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      return error("ユーザーが見つかりません");
    }

    // 自分のメンバーシップを取得
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!myMembership) {
      return error("グループメンバーではありません");
    }

    // グループのアクティブメンバー数を確認
    const activeMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .collect();

    if (activeMembers.length <= 1) {
      return error(
        "最後の1人のメンバーは脱退できません。グループを削除してください",
      );
    }

    // メンバーシップを論理削除
    await ctx.db.patch(myMembership._id, {
      leftAt: Date.now(),
      leftBy: userId,
    });

    // activeGroupIdが脱退したグループの場合、別のグループに切り替え
    if (user.activeGroupId === args.groupId) {
      // 他のアクティブなグループを取得（最も最近参加したグループ）
      const otherMemberships = await ctx.db
        .query("groupMembers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("leftAt"), undefined))
        .order("desc")
        .collect();

      const otherGroup = otherMemberships.find(
        (m) => m.groupId !== args.groupId,
      );

      await ctx.db.patch(userId, {
        activeGroupId: otherGroup?.groupId ?? undefined,
      });
    }

    return success(undefined);
  },
});

/**
 * グループを削除
 */
export const deleteGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<void>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // ユーザー情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      return error("ユーザーが見つかりません");
    }

    // グループを取得
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      return error("グループが見つかりません");
    }

    // 既に削除済みかチェック
    if (group.deletedAt !== undefined) {
      return error("このグループは既に削除されています");
    }

    // 自分のメンバーシップを取得
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!myMembership) {
      return error("グループメンバーではありません");
    }

    // グループのアクティブメンバー数を確認
    const activeMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .collect();

    if (activeMembers.length > 1) {
      return error(
        "メンバーが複数いるグループは削除できません。先に脱退してください",
      );
    }

    const now = Date.now();

    // グループを論理削除
    await ctx.db.patch(args.groupId, {
      deletedAt: now,
      deletedBy: userId,
    });

    // 全メンバーシップを論理削除
    for (const member of activeMembers) {
      await ctx.db.patch(member._id, {
        leftAt: now,
        leftBy: userId,
      });
    }

    // 関連する処方箋を論理削除
    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    for (const prescription of prescriptions) {
      await ctx.db.patch(prescription._id, {
        deletedAt: now,
        deletedBy: userId,
      });

      // 処方箋に紐付く薬を論理削除
      const medicines = await ctx.db
        .query("medicines")
        .withIndex("by_prescriptionId", (q) =>
          q.eq("prescriptionId", prescription._id),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      for (const medicine of medicines) {
        await ctx.db.patch(medicine._id, {
          deletedAt: now,
          deletedBy: userId,
        });

        // 薬に紐付くスケジュールを論理削除
        const schedules = await ctx.db
          .query("medicationSchedules")
          .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect();

        for (const schedule of schedules) {
          await ctx.db.patch(schedule._id, {
            deletedAt: now,
            deletedBy: userId,
          });
        }
      }
    }

    // 関連する服薬記録を論理削除
    const records = await ctx.db
      .query("medicationRecords")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    for (const record of records) {
      await ctx.db.patch(record._id, {
        deletedAt: now,
        deletedBy: userId,
      });
    }

    // activeGroupIdが削除したグループの場合、別のグループに切り替え
    if (user.activeGroupId === args.groupId) {
      // 他のアクティブなグループを取得
      const otherMemberships = await ctx.db
        .query("groupMembers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("leftAt"), undefined))
        .order("desc")
        .collect();

      const otherGroup = otherMemberships.find(
        (m) => m.groupId !== args.groupId,
      );

      await ctx.db.patch(userId, {
        activeGroupId: otherGroup?.groupId ?? undefined,
      });
    }

    return success(undefined);
  },
});
