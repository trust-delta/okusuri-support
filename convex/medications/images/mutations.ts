import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";

/**
 * タイミング型定義（共通）
 */
const timingValidator = v.union(
  v.literal("morning"),
  v.literal("noon"),
  v.literal("evening"),
  v.literal("bedtime"),
  v.literal("asNeeded"),
);

/**
 * 服薬記録に画像を添付
 * 既存画像がある場合は差し替え（旧画像をストレージから削除）
 */
export const attachMedicationImage = mutation({
  args: {
    groupId: v.id("groups"),
    scheduledDate: v.string(),
    timing: timingValidator,
    storageId: v.id("_storage"),
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

    // グループ内の患者を取得
    const patient = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) =>
        q.and(
          q.eq(q.field("role"), "patient"),
          q.eq(q.field("leftAt"), undefined),
        ),
      )
      .first();

    if (!patient) {
      throw new ConvexError("グループに患者が登録されていません");
    }

    const now = Date.now();

    // 既存画像を検索
    const existingImage = await ctx.db
      .query("medicationImages")
      .withIndex("by_patientId_timing_scheduledDate", (q) =>
        q
          .eq("patientId", patient.userId)
          .eq("timing", args.timing)
          .eq("scheduledDate", args.scheduledDate),
      )
      .first();

    if (existingImage) {
      // 既存画像がある場合は差し替え
      // 旧画像をストレージから削除
      await ctx.storage.delete(existingImage.imageId);

      // レコードを更新
      await ctx.db.patch(existingImage._id, {
        imageId: args.storageId,
        notes: args.notes,
        uploadedBy: userId,
        updatedAt: now,
      });

      return existingImage._id;
    } else {
      // 新規作成
      const imageId = await ctx.db.insert("medicationImages", {
        groupId: args.groupId,
        patientId: patient.userId,
        scheduledDate: args.scheduledDate,
        timing: args.timing,
        imageId: args.storageId,
        notes: args.notes,
        uploadedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      return imageId;
    }
  },
});

/**
 * 服薬記録の画像を削除
 */
export const removeMedicationImage = mutation({
  args: {
    imageId: v.id("medicationImages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // 画像レコードを取得
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("画像が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), image.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // ストレージから画像を削除
    await ctx.storage.delete(image.imageId);

    // レコードを削除
    await ctx.db.delete(args.imageId);
  },
});

/**
 * 服薬記録画像のメモを更新
 */
export const updateMedicationImageNotes = mutation({
  args: {
    imageId: v.id("medicationImages"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    // 画像レコードを取得
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("画像が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), image.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // メモを更新
    await ctx.db.patch(args.imageId, {
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});
