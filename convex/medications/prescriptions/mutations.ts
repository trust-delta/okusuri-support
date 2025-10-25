import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * 処方箋を作成（薬も一緒に登録）
 */
export const createPrescription = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.optional(v.string()), // YYYY-MM-DD
    notes: v.optional(v.string()),
    medicines: v.optional(
      v.array(
        v.object({
          name: v.string(),
          dosage: v.optional(v.string()),
          timings: v.array(
            v.union(
              v.literal("morning"),
              v.literal("noon"),
              v.literal("evening"),
              v.literal("bedtime"),
              v.literal("asNeeded"),
            ),
          ),
          description: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // 日付の妥当性チェック
    if (args.endDate && args.startDate > args.endDate) {
      throw new Error("終了日は開始日より後である必要があります");
    }

    const now = Date.now();
    const prescriptionId = await ctx.db.insert("prescriptions", {
      groupId: args.groupId,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      notes: args.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // 薬も一緒に登録
    if (args.medicines && args.medicines.length > 0) {
      for (const medicine of args.medicines) {
        if (!medicine.name.trim()) continue; // 空の薬名はスキップ
        if (!medicine.timings || medicine.timings.length === 0) continue; // タイミング未選択はスキップ

        // 薬を作成
        const medicineId = await ctx.db.insert("medicines", {
          groupId: args.groupId,
          prescriptionId,
          name: medicine.name.trim(),
          description: medicine.description,
          createdBy: userId,
          createdAt: now,
          isActive: true,
        });

        // スケジュールを作成
        await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId: args.groupId,
          timings: medicine.timings,
          dosage: medicine.dosage,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return prescriptionId;
  },
});

/**
 * 処方箋を更新
 */
export const updatePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new Error("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // 更新後の値を計算
    const newStartDate = args.startDate ?? prescription.startDate;
    const newEndDate = args.endDate !== undefined ? args.endDate : prescription.endDate;

    // 日付の妥当性チェック
    if (newEndDate && newStartDate > newEndDate) {
      throw new Error("終了日は開始日より後である必要があります");
    }

    // 更新するフィールドを準備
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.prescriptionId, updates);

    return args.prescriptionId;
  },
});

/**
 * 処方箋を削除
 */
export const deletePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new Error("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new Error("このグループのメンバーではありません");
    }

    // この処方箋に紐付く薬を取得
    const relatedMedicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) => q.eq("prescriptionId", args.prescriptionId))
      .collect();

    // 紐付く薬に服薬記録があるかチェック
    for (const medicine of relatedMedicines) {
      const records = await ctx.db
        .query("medicationRecords")
        .filter((q) => q.eq(q.field("medicineId"), medicine._id))
        .first();

      if (records) {
        throw new Error(
          "この処方箋の薬に服薬記録が存在するため、削除できません",
        );
      }
    }

    // 薬とスケジュールを削除
    for (const medicine of relatedMedicines) {
      // スケジュールを削除
      const schedules = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
        .collect();

      for (const schedule of schedules) {
        await ctx.db.delete(schedule._id);
      }

      // 薬を削除
      await ctx.db.delete(medicine._id);
    }

    // 処方箋を削除
    await ctx.db.delete(args.prescriptionId);
  },
});
