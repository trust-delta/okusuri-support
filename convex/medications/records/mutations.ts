import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

/**
 * 服薬記録を作成（簡易記録・処方箋ベース両対応）
 * 在庫追跡が有効な場合、消費記録も自動生成
 */
export const recordSimpleMedication = mutation({
  args: {
    groupId: v.id("groups"),
    timing: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("evening"),
      v.literal("bedtime"),
      v.literal("asNeeded"),
    ),
    scheduledDate: v.string(), // YYYY-MM-DD
    medicineId: v.optional(v.id("medicines")), // 処方箋ベースの場合に使用
    scheduleId: v.optional(v.id("medicationSchedules")), // 処方箋ベースの場合に使用
    simpleMedicineName: v.optional(v.string()), // 簡易記録の場合に使用
    status: v.union(v.literal("taken"), v.literal("skipped")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Result<Id<"medicationRecords">>> => {
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

    // 服薬者のIDを取得(患者本人または患者がいない場合は記録者)
    const patientMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .first();

    const patientId = patientMember?.userId ?? userId;

    // 薬剤情報のバリデーション（medicineIdまたはsimpleMedicineNameが必要）
    if (!args.medicineId && !args.simpleMedicineName) {
      return error("薬剤情報が必要です");
    }

    const now = Date.now();

    // 新規レコード作成
    const recordId = await ctx.db.insert("medicationRecords", {
      medicineId: args.medicineId,
      scheduleId: args.scheduleId,
      simpleMedicineName: args.simpleMedicineName,
      groupId: args.groupId,
      patientId,
      timing: args.timing,
      scheduledDate: args.scheduledDate,
      takenAt: args.status === "taken" ? now : undefined,
      status: args.status,
      recordedBy: userId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // 在庫追跡: 服用済みの場合のみ消費記録を作成
    const medicineId = args.medicineId;
    if (args.status === "taken" && medicineId) {
      const inventory = await ctx.db
        .query("medicineInventory")
        .withIndex("by_medicineId", (q) => q.eq("medicineId", medicineId))
        .first();

      if (inventory?.isTrackingEnabled) {
        // スケジュールから用量を取得
        let consumeAmount = 1; // デフォルト1単位
        if (args.scheduleId) {
          const schedule = await ctx.db.get(args.scheduleId);
          if (schedule?.dosage?.amount) {
            consumeAmount = schedule.dosage.amount;
          }
        }

        const newQuantity = Math.max(
          0,
          inventory.currentQuantity - consumeAmount,
        );

        // 消費記録を作成
        await ctx.db.insert("medicineConsumptionRecords", {
          medicineId,
          inventoryId: inventory._id,
          groupId: args.groupId,
          patientId,
          consumptionType: "scheduled",
          quantity: consumeAmount,
          quantityBefore: inventory.currentQuantity,
          quantityAfter: newQuantity,
          relatedRecordId: recordId,
          recordedBy: userId,
          recordedAt: now,
          createdAt: now,
        });

        // 在庫を更新
        await ctx.db.patch(inventory._id, {
          currentQuantity: newQuantity,
          updatedAt: now,
        });

        // 残量警告チェック
        const medicine = await ctx.db.get(medicineId);
        const medicineName = medicine?.name ?? "不明な薬";

        // 在庫切れチェック（処方箋継続中の場合は重大なアラート）
        if (newQuantity === 0 && inventory.currentQuantity > 0) {
          // 処方箋が有効かどうか確認
          let isPrescriptionActive = false;
          if (medicine?.prescriptionId) {
            const prescription = await ctx.db.get(medicine.prescriptionId);
            if (prescription && !prescription.deletedAt) {
              const today = new Date().toISOString().split("T")[0] ?? "";
              // 処方箋が有効: isActive=true かつ (終了日なし または 終了日が今日以降)
              isPrescriptionActive =
                prescription.isActive &&
                (!prescription.endDate || prescription.endDate >= today);
            }
          }

          if (isPrescriptionActive) {
            // 処方箋継続中の在庫切れは重大
            await ctx.db.insert("inventoryAlerts", {
              inventoryId: inventory._id,
              groupId: args.groupId,
              alertType: "out_of_stock",
              severity: "critical",
              message: `${medicineName}が在庫切れです。処方箋は継続中のため、補充が必要です`,
              medicineName,
              isRead: false,
              createdAt: now,
            });
          } else {
            // 処方箋なしまたは終了の在庫切れ
            await ctx.db.insert("inventoryAlerts", {
              inventoryId: inventory._id,
              groupId: args.groupId,
              alertType: "low_stock",
              severity: "critical",
              message: `${medicineName}の残量が0${inventory.unit}になりました`,
              medicineName,
              isRead: false,
              createdAt: now,
            });
          }
        } else if (
          inventory.warningThreshold !== undefined &&
          newQuantity <= inventory.warningThreshold &&
          inventory.currentQuantity > inventory.warningThreshold
        ) {
          // 警告閾値を下回った場合のみアラート
          await ctx.db.insert("inventoryAlerts", {
            inventoryId: inventory._id,
            groupId: args.groupId,
            alertType: "low_stock",
            severity: "warning",
            message: `${medicineName}の残量が${newQuantity}${inventory.unit}になりました`,
            medicineName,
            isRead: false,
            createdAt: now,
          });
        }
      }
    }

    return success(recordId);
  },
});

/**
 * 服薬記録を更新
 */
export const updateMedicationRecord = mutation({
  args: {
    recordId: v.id("medicationRecords"),
    status: v.optional(v.union(v.literal("taken"), v.literal("skipped"))),
    notes: v.optional(v.string()),
    simpleMedicineName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 記録を取得
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      return error("記録が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), record.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    const now = Date.now();

    // 現在のレコードを履歴に保存
    await ctx.db.insert("medicationRecordsHistory", {
      originalRecordId: args.recordId,
      medicineId: record.medicineId,
      scheduleId: record.scheduleId,
      simpleMedicineName: record.simpleMedicineName,
      groupId: record.groupId,
      patientId: record.patientId,
      timing: record.timing,
      scheduledDate: record.scheduledDate,
      takenAt: record.takenAt,
      status: record.status,
      recordedBy: record.recordedBy,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      historyType: "updated",
      archivedAt: now,
      archivedBy: userId,
    });

    // レコードを更新
    const updateData: {
      status?: "taken" | "skipped";
      notes?: string;
      simpleMedicineName?: string;
      takenAt?: number | undefined;
      updatedAt: number;
    } = {
      updatedAt: now,
    };

    if (args.status !== undefined) {
      updateData.status = args.status;
      updateData.takenAt = args.status === "taken" ? now : undefined;
    }
    if (args.notes !== undefined) {
      updateData.notes = args.notes;
    }
    if (args.simpleMedicineName !== undefined) {
      updateData.simpleMedicineName = args.simpleMedicineName;
    }

    await ctx.db.patch(args.recordId, updateData);

    return success({});
  },
});

/**
 * 服薬記録を削除（履歴に保存）
 */
export const deleteMedicationRecord = mutation({
  args: {
    recordId: v.id("medicationRecords"),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 記録を取得
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      return error("記録が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), record.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    const now = Date.now();

    // 履歴テーブルに保存
    await ctx.db.insert("medicationRecordsHistory", {
      originalRecordId: args.recordId,
      medicineId: record.medicineId,
      scheduleId: record.scheduleId,
      simpleMedicineName: record.simpleMedicineName,
      groupId: record.groupId,
      patientId: record.patientId,
      timing: record.timing,
      scheduledDate: record.scheduledDate,
      takenAt: record.takenAt,
      status: record.status,
      recordedBy: record.recordedBy,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      historyType: "deleted",
      archivedAt: now,
      archivedBy: userId,
    });

    // 元のレコードを削除
    await ctx.db.delete(args.recordId);

    return success({});
  },
});
