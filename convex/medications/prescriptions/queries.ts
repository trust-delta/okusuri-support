import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";
import { getActiveMedicationsForDate } from "./helpers";

type PrescriptionWithImage = Doc<"prescriptions"> & {
  imageUrl: string | null;
};

type MedicineWithSchedule = Doc<"medicines"> & {
  schedule: Doc<"medicationSchedules"> | null;
};

/**
 * グループの処方箋一覧を取得
 */
export const getPrescriptions = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<PrescriptionWithImage[]>> => {
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

    // 処方箋一覧を取得（開始日の降順）
    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // startDateで降順ソート（新しい順）
    prescriptions.sort((a, b) => b.startDate.localeCompare(a.startDate));

    // 各処方箋の画像URLを取得
    const prescriptionsWithImageUrl = await Promise.all(
      prescriptions.map(async (prescription) => {
        const imageUrl = prescription.imageId
          ? await ctx.storage.getUrl(prescription.imageId)
          : null;
        return {
          ...prescription,
          imageUrl,
        };
      }),
    );

    return success(prescriptionsWithImageUrl);
  },
});

/**
 * グループの削除された処方箋一覧を取得（ゴミ箱用）
 */
export const getDeletedPrescriptions = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<Doc<"prescriptions">[]>> => {
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

    // 削除された処方箋一覧を取得（削除日の降順）
    const deletedPrescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_groupId_deletedAt", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

    // deletedAtで降順ソート（新しく削除されたものが上）
    deletedPrescriptions.sort((a, b) => {
      const aTime = a.deletedAt ?? 0;
      const bTime = b.deletedAt ?? 0;
      return bTime - aTime;
    });

    return success(deletedPrescriptions);
  },
});

/**
 * 処方箋の詳細を取得
 */
export const getPrescription = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args): Promise<Result<Doc<"prescriptions">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription || prescription.deletedAt !== undefined) {
      return error("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    return success(prescription);
  },
});

/**
 * 処方箋に紐付く薬の一覧を取得
 */
export const getPrescriptionMedicines = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args): Promise<Result<MedicineWithSchedule[]>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription || prescription.deletedAt !== undefined) {
      return error("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // この処方箋に紐付く薬を取得
    const medicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // 各薬のスケジュールも取得
    const medicinesWithSchedules = await Promise.all(
      medicines.map(async (medicine) => {
        const schedule = await ctx.db
          .query("medicationSchedules")
          .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .first();

        return {
          ...medicine,
          schedule,
        };
      }),
    );

    return success(medicinesWithSchedules);
  },
});

/**
 * 指定日に有効な薬剤を取得（処方箋ベース）
 */
export const getActiveMedicationsForDateQuery = query({
  args: {
    groupId: v.id("groups"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Result<Awaited<ReturnType<typeof getActiveMedicationsForDate>>>
  > => {
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

    const result = await getActiveMedicationsForDate(
      ctx,
      args.groupId,
      args.date,
    );
    return success(result);
  },
});
