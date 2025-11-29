import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";

/**
 * 薬名統合グループを作成
 *
 * 表記ゆれのある薬名を1つの代表名にまとめる
 */
export const createMedicineGroup = mutation({
  args: {
    groupId: v.id("groups"),
    canonicalName: v.string(), // 代表名
    medicineNames: v.array(v.string()), // 統合する薬名リスト
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // バリデーション
    if (!args.canonicalName.trim()) {
      throw new ConvexError("代表名を入力してください");
    }

    if (args.medicineNames.length === 0) {
      throw new ConvexError("少なくとも1つの薬名を指定してください");
    }

    // 重複チェック：既に他のグループに含まれている薬名がないか確認
    const existingGroups = await ctx.db
      .query("medicineGroups")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const existingGroup of existingGroups) {
      for (const medicineName of args.medicineNames) {
        if (existingGroup.medicineNames.includes(medicineName)) {
          throw new ConvexError(
            `薬名「${medicineName}」は既に別のグループ「${existingGroup.canonicalName}」に含まれています`,
          );
        }
      }
    }

    const now = Date.now();
    const medicineGroupId = await ctx.db.insert("medicineGroups", {
      groupId: args.groupId,
      canonicalName: args.canonicalName.trim(),
      medicineNames: args.medicineNames.map((name) => name.trim()),
      notes: args.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return medicineGroupId;
  },
});

/**
 * 薬名統合グループを更新
 */
export const updateMedicineGroup = mutation({
  args: {
    medicineGroupId: v.id("medicineGroups"),
    canonicalName: v.optional(v.string()),
    medicineNames: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // 既存のグループを取得
    const existingGroup = await ctx.db.get(args.medicineGroupId);
    if (!existingGroup) {
      throw new ConvexError("指定された薬名グループが見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), existingGroup.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // バリデーション
    if (args.canonicalName !== undefined && !args.canonicalName.trim()) {
      throw new ConvexError("代表名を入力してください");
    }

    if (args.medicineNames !== undefined && args.medicineNames.length === 0) {
      throw new ConvexError("少なくとも1つの薬名を指定してください");
    }

    // 重複チェック：他のグループに含まれている薬名がないか確認
    if (args.medicineNames) {
      const otherGroups = await ctx.db
        .query("medicineGroups")
        .withIndex("by_groupId", (q) => q.eq("groupId", existingGroup.groupId))
        .filter((q) => q.neq(q.field("_id"), args.medicineGroupId))
        .collect();

      for (const otherGroup of otherGroups) {
        for (const medicineName of args.medicineNames) {
          if (otherGroup.medicineNames.includes(medicineName)) {
            throw new ConvexError(
              `薬名「${medicineName}」は既に別のグループ「${otherGroup.canonicalName}」に含まれています`,
            );
          }
        }
      }
    }

    // 更新データを準備
    const updateData: {
      canonicalName?: string;
      medicineNames?: string[];
      notes?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.canonicalName !== undefined) {
      updateData.canonicalName = args.canonicalName.trim();
    }

    if (args.medicineNames !== undefined) {
      updateData.medicineNames = args.medicineNames.map((name) => name.trim());
    }

    if (args.notes !== undefined) {
      updateData.notes = args.notes;
    }

    await ctx.db.patch(args.medicineGroupId, updateData);

    return args.medicineGroupId;
  },
});

/**
 * 薬名統合グループを削除
 */
export const deleteMedicineGroup = mutation({
  args: {
    medicineGroupId: v.id("medicineGroups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // 既存のグループを取得
    const existingGroup = await ctx.db.get(args.medicineGroupId);
    if (!existingGroup) {
      throw new ConvexError("指定された薬名グループが見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), existingGroup.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // グループを削除
    await ctx.db.delete(args.medicineGroupId);
  },
});
