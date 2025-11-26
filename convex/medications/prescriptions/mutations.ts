import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";

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
          description: v.optional(v.string()),
        }),
      ),
    ),
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

    // 日付の妥当性チェック
    if (args.endDate && args.startDate > args.endDate) {
      throw new ConvexError("終了日は開始日より後である必要があります");
    }

    const now = Date.now();
    const prescriptionId = await ctx.db.insert("prescriptions", {
      groupId: args.groupId,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: true, // 新規作成時は有効
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
    clearEndDate: v.optional(v.boolean()), // trueの場合、終了日を削除
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // 更新後の値を計算
    const newStartDate = args.startDate ?? prescription.startDate;
    // clearEndDateがtrueの場合は終了日を削除
    const newEndDate = args.clearEndDate
      ? undefined
      : args.endDate !== undefined
        ? args.endDate
        : prescription.endDate;

    // 日付の妥当性チェック（終了日がある場合のみ）
    if (newEndDate && newStartDate > newEndDate) {
      throw new ConvexError("終了日は開始日より後である必要があります");
    }

    // 更新するフィールドを準備
    const updates: {
      updatedAt: number;
      name?: string;
      startDate?: string;
      endDate?: string;
      notes?: string;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    // 終了日の更新: clearEndDateがtrueなら削除、endDateが指定されていれば更新
    if (args.clearEndDate) {
      updates.endDate = undefined;
    } else if (args.endDate !== undefined) {
      updates.endDate = args.endDate;
    }
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.prescriptionId, updates);

    return args.prescriptionId;
  },
});

/**
 * 処方箋を削除（記録がある場合は論理削除、ない場合は物理削除）
 */
export const deletePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // 既に論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      throw new ConvexError("この処方箋は既に削除されています");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // この処方箋に紐付く薬を取得
    const relatedMedicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId),
      )
      .collect();

    const now = Date.now();

    // 常に論理削除
    // 処方箋を論理削除
    await ctx.db.patch(args.prescriptionId, {
      deletedAt: now,
      deletedBy: userId,
    });

    // 薬とスケジュールと記録を論理削除
    for (const medicine of relatedMedicines) {
      // 薬を論理削除
      await ctx.db.patch(medicine._id, {
        deletedAt: now,
        deletedBy: userId,
      });

      // スケジュールを論理削除
      const schedules = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
        .collect();

      for (const schedule of schedules) {
        await ctx.db.patch(schedule._id, {
          deletedAt: now,
          deletedBy: userId,
        });
      }

      // 記録を論理削除
      const records = await ctx.db
        .query("medicationRecords")
        .filter((q) => q.eq(q.field("medicineId"), medicine._id))
        .collect();

      for (const record of records) {
        await ctx.db.patch(record._id, {
          deletedAt: now,
          deletedBy: userId,
        });
      }
    }
  },
});

/**
 * 処方箋を完全削除（物理削除）
 * 既に論理削除されている処方箋のみを対象とする
 */
export const permanentlyDeletePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // 論理削除されていない場合はエラー
    if (prescription.deletedAt === undefined) {
      throw new ConvexError(
        "この処方箋は削除されていません。先に削除してください。",
      );
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // この処方箋に紐付く薬を取得（論理削除されたものも含む）
    const relatedMedicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId),
      )
      .collect();

    // 薬とスケジュールと記録を物理削除
    for (const medicine of relatedMedicines) {
      // 記録を物理削除
      const records = await ctx.db
        .query("medicationRecords")
        .filter((q) => q.eq(q.field("medicineId"), medicine._id))
        .collect();

      for (const record of records) {
        await ctx.db.delete(record._id);
      }

      // スケジュールを物理削除
      const schedules = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
        .collect();

      for (const schedule of schedules) {
        await ctx.db.delete(schedule._id);
      }

      // 薬を物理削除
      await ctx.db.delete(medicine._id);
    }

    // 処方箋を物理削除
    await ctx.db.delete(args.prescriptionId);
  },
});

/**
 * 処方箋を無効化（isActiveをfalseに設定）
 */
export const deactivatePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // 既に論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      throw new ConvexError("削除された処方箋は無効化できません");
    }

    // 既に無効化されている場合はエラー
    if (!prescription.isActive) {
      throw new ConvexError("この処方箋は既に無効化されています");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // isActiveをfalseに設定
    await ctx.db.patch(args.prescriptionId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * 処方箋を有効化（isActiveをtrueに設定）
 */
export const activatePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // 既に論理削除されている場合はエラー
    if (prescription.deletedAt !== undefined) {
      throw new ConvexError("削除された処方箋は有効化できません");
    }

    // 既に有効化されている場合はエラー
    if (prescription.isActive) {
      throw new ConvexError("この処方箋は既に有効化されています");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // isActiveをtrueに設定
    await ctx.db.patch(args.prescriptionId, {
      isActive: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * 論理削除された処方箋を復元
 */
export const restorePrescription = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("認証が必要です");
    }

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new ConvexError("処方箋が見つかりません");
    }

    // 論理削除されていない場合はエラー
    if (prescription.deletedAt === undefined) {
      throw new ConvexError("この処方箋は削除されていません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), prescription.groupId))
      .first();

    if (!membership) {
      throw new ConvexError("このグループのメンバーではありません");
    }

    // 処方箋を復元（deletedAtとdeletedByをundefinedに）
    await ctx.db.patch(args.prescriptionId, {
      deletedAt: undefined,
      deletedBy: undefined,
    });

    // この処方箋に紐付く薬を取得（削除されたものも含む）
    const relatedMedicines = await ctx.db
      .query("medicines")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId),
      )
      .collect();

    // 薬とスケジュールと記録を復元
    for (const medicine of relatedMedicines) {
      // 薬を復元
      if (medicine.deletedAt !== undefined) {
        await ctx.db.patch(medicine._id, {
          deletedAt: undefined,
          deletedBy: undefined,
        });
      }

      // スケジュールを復元
      const schedules = await ctx.db
        .query("medicationSchedules")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicine._id))
        .collect();

      for (const schedule of schedules) {
        if (schedule.deletedAt !== undefined) {
          await ctx.db.patch(schedule._id, {
            deletedAt: undefined,
            deletedBy: undefined,
          });
        }
      }

      // 記録を復元
      const records = await ctx.db
        .query("medicationRecords")
        .filter((q) => q.eq(q.field("medicineId"), medicine._id))
        .collect();

      for (const record of records) {
        if (record.deletedAt !== undefined) {
          await ctx.db.patch(record._id, {
            deletedAt: undefined,
            deletedBy: undefined,
          });
        }
      }
    }
  },
});
