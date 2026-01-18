import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";
import { timingValidator } from "./validators";

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
  handler: async (ctx, args): Promise<Result<Id<"medicationImages">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
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
      return error("グループに患者が登録されていません");
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

      return success(existingImage._id);
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

      return success(imageId);
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
  handler: async (ctx, args): Promise<Result<null>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 画像レコードを取得
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      return error("画像が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), image.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // ストレージから画像を削除
    await ctx.storage.delete(image.imageId);

    // レコードを削除
    await ctx.db.delete(args.imageId);

    return success(null);
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
  handler: async (ctx, args): Promise<Result<null>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 画像レコードを取得
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      return error("画像が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), image.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // メモを更新
    await ctx.db.patch(args.imageId, {
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return success(null);
  },
});
