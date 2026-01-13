import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../../_generated/server";

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
 * 指定日・時間帯の服薬画像を取得
 */
export const getMedicationImage = query({
  args: {
    groupId: v.id("groups"),
    patientId: v.optional(v.string()),
    scheduledDate: v.string(),
    timing: timingValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return null;
    }

    // patientIdが指定されていない場合は、グループ内の患者を取得
    let targetPatientId = args.patientId;
    if (!targetPatientId) {
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
        return null;
      }
      targetPatientId = patient.userId;
    }

    // 画像を取得
    // targetPatientIdは上でnullチェック済みなのでstringとして使用可能
    const patientIdForQuery = targetPatientId as string;
    const image = await ctx.db
      .query("medicationImages")
      .withIndex("by_patientId_timing_scheduledDate", (q) =>
        q
          .eq("patientId", patientIdForQuery)
          .eq("timing", args.timing)
          .eq("scheduledDate", args.scheduledDate),
      )
      .first();

    if (!image) {
      return null;
    }

    // 画像URLを取得
    const imageUrl = await ctx.storage.getUrl(image.imageId);

    return {
      _id: image._id,
      imageUrl,
      notes: image.notes,
      timing: image.timing,
      scheduledDate: image.scheduledDate,
      createdAt: image.createdAt,
    };
  },
});

/**
 * 指定日の全時間帯の服薬画像を取得
 */
export const getDayMedicationImages = query({
  args: {
    groupId: v.id("groups"),
    patientId: v.optional(v.string()),
    scheduledDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {};
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      return {};
    }

    // patientIdが指定されていない場合は、グループ内の患者を取得
    let targetPatientId = args.patientId;
    if (!targetPatientId) {
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
        return {};
      }
      targetPatientId = patient.userId;
    }

    // 指定日の全画像を取得
    // targetPatientIdは上でnullチェック済みなのでstringとして使用可能
    const patientIdForQuery = targetPatientId as string;
    const images = await ctx.db
      .query("medicationImages")
      .withIndex("by_patientId_scheduledDate", (q) =>
        q
          .eq("patientId", patientIdForQuery)
          .eq("scheduledDate", args.scheduledDate),
      )
      .collect();

    // タイミングをキーにしたオブジェクトに変換
    const result: Record<
      string,
      {
        _id: string;
        imageUrl: string | null;
        notes?: string;
        timing: string;
        scheduledDate: string;
        createdAt: number;
      }
    > = {};

    for (const image of images) {
      const imageUrl = await ctx.storage.getUrl(image.imageId);
      result[image.timing] = {
        _id: image._id,
        imageUrl,
        notes: image.notes,
        timing: image.timing,
        scheduledDate: image.scheduledDate,
        createdAt: image.createdAt,
      };
    }

    return result;
  },
});
