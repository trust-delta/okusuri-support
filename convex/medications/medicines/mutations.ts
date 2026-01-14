import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

/**
 * 薬を削除（関連する記録・スケジュールも論理削除）
 */
export const deleteMedicine = mutation({
  args: {
    medicineId: v.id("medicines"),
  },
  handler: async (ctx, args): Promise<Result<null>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) {
      return error("薬が見つかりません");
    }

    // 既に論理削除されている場合はエラー
    if (medicine.deletedAt !== undefined) {
      return error("この薬は既に削除されています");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), medicine.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    const now = Date.now();

    // 薬を論理削除
    await ctx.db.patch(args.medicineId, {
      deletedAt: now,
      deletedBy: userId,
    });

    // スケジュールを論理削除
    const schedules = await ctx.db
      .query("medicationSchedules")
      .withIndex("by_medicineId", (q) => q.eq("medicineId", args.medicineId))
      .collect();

    for (const schedule of schedules) {
      if (schedule.deletedAt === undefined) {
        await ctx.db.patch(schedule._id, {
          deletedAt: now,
          deletedBy: userId,
        });
      }
    }

    // 関連する記録を論理削除
    const records = await ctx.db
      .query("medicationRecords")
      .filter((q) => q.eq(q.field("medicineId"), args.medicineId))
      .collect();

    for (const record of records) {
      if (record.deletedAt === undefined) {
        await ctx.db.patch(record._id, {
          deletedAt: now,
          deletedBy: userId,
        });
      }
    }

    return success(null);
  },
});

/**
 * 薬を更新（名前・説明・用量・タイミング）
 */
export const updateMedicine = mutation({
  args: {
    medicineId: v.id("medicines"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    dosage: v.optional(
      v.object({
        amount: v.number(),
        unit: v.string(),
      }),
    ),
    timings: v.optional(
      v.array(
        v.union(
          v.literal("morning"),
          v.literal("noon"),
          v.literal("evening"),
          v.literal("bedtime"),
          v.literal("asNeeded"),
        ),
      ),
    ),
    clearDescription: v.optional(v.boolean()),
    clearDosage: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Result<Id<"medicines">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) {
      return error("薬が見つかりません");
    }

    // 既に論理削除されている場合はエラー
    if (medicine.deletedAt !== undefined) {
      return error("削除された薬は編集できません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), medicine.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    const now = Date.now();

    // 薬の更新
    const medicineUpdates: {
      name?: string;
      description?: string;
    } = {};

    if (args.name !== undefined) {
      medicineUpdates.name = args.name;
    }
    if (args.clearDescription) {
      medicineUpdates.description = undefined;
    } else if (args.description !== undefined) {
      medicineUpdates.description = args.description;
    }

    if (Object.keys(medicineUpdates).length > 0) {
      await ctx.db.patch(args.medicineId, medicineUpdates);
    }

    // スケジュールの更新（用量・タイミング）
    if (
      args.dosage !== undefined ||
      args.timings !== undefined ||
      args.clearDosage
    ) {
      const schedule = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", args.medicineId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .first();

      if (schedule) {
        const scheduleUpdates: {
          dosage?: { amount: number; unit: string };
          timings?: Array<
            "morning" | "noon" | "evening" | "bedtime" | "asNeeded"
          >;
          updatedAt: number;
        } = {
          updatedAt: now,
        };

        if (args.clearDosage) {
          scheduleUpdates.dosage = undefined;
        } else if (args.dosage !== undefined) {
          scheduleUpdates.dosage = args.dosage;
        }

        if (args.timings !== undefined) {
          scheduleUpdates.timings = args.timings;
        }

        await ctx.db.patch(schedule._id, scheduleUpdates);
      }
    }

    return success(args.medicineId);
  },
});

/**
 * 既存処方箋に薬を追加
 */
export const addMedicineToPrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    name: v.string(),
    description: v.optional(v.string()),
    dosage: v.optional(
      v.object({
        amount: v.number(),
        unit: v.string(),
      }),
    ),
    timings: v.array(
      v.union(
        v.literal("morning"),
        v.literal("noon"),
        v.literal("evening"),
        v.literal("bedtime"),
        v.literal("asNeeded"),
      ),
    ),
  },
  handler: async (ctx, args): Promise<Result<Id<"medicines">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      return error("処方箋が見つかりません");
    }

    // 既に論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      return error("削除された処方箋には薬を追加できません");
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

    // 薬名のバリデーション
    if (!args.name.trim()) {
      return error("薬名を入力してください");
    }

    // タイミングのバリデーション
    if (args.timings.length === 0) {
      return error("服用タイミングを1つ以上選択してください");
    }

    const now = Date.now();

    // 薬を作成
    const medicineId = await ctx.db.insert("medicines", {
      groupId: prescription.groupId,
      prescriptionId: args.prescriptionId,
      name: args.name.trim(),
      description: args.description,
      createdBy: userId,
      createdAt: now,
    });

    // スケジュールを作成
    await ctx.db.insert("medicationSchedules", {
      medicineId,
      groupId: prescription.groupId,
      timings: args.timings,
      dosage: args.dosage,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return success(medicineId);
  },
});
