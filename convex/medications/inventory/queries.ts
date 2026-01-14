import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

type InventoryWithMedicineName = Doc<"medicineInventory"> & {
  medicineName: string;
};

type InventoryWithLowStock = InventoryWithMedicineName & {
  isLowStock: boolean;
};

type LowStockInventory = InventoryWithMedicineName & {
  isCritical: boolean;
};

type OutOfStockWithPrescription = Doc<"medicineInventory"> & {
  medicineName: string;
  prescriptionName: string | undefined;
};

type ConsumptionRecordWithDetails = Doc<"medicineConsumptionRecords"> & {
  medicineName: string;
  unit: string;
};

type DailyConsumptionSummary = {
  date: string;
  medicineId: Doc<"medicines">["_id"];
  totalConsumed: number;
  scheduled: number;
  extra: number;
  lost: number;
  adjustment: number;
  refill: number;
};

/**
 * 薬の在庫情報を取得
 */
export const getInventoryByMedicine = query({
  args: {
    medicineId: v.id("medicines"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Result<InventoryWithMedicineName | null>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 薬を取得
    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) {
      return success(null);
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

    // 在庫情報を取得
    const inventory = await ctx.db
      .query("medicineInventory")
      .withIndex("by_medicineId", (q) => q.eq("medicineId", args.medicineId))
      .first();

    if (!inventory) {
      return success(null);
    }

    return success({
      ...inventory,
      medicineName: medicine.name,
    });
  },
});

/**
 * グループの在庫一覧を取得
 */
export const getInventoriesByGroup = query({
  args: {
    groupId: v.id("groups"),
    trackingOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Result<InventoryWithLowStock[]>> => {
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

    // 在庫一覧を取得
    const inventoriesQuery = ctx.db
      .query("medicineInventory")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId));

    const inventories = await inventoriesQuery.collect();

    // trackingOnlyがtrueの場合はフィルタリング
    const filteredInventories = args.trackingOnly
      ? inventories.filter((inv) => inv.isTrackingEnabled)
      : inventories;

    // 薬の名前を付加
    const inventoriesWithNames = await Promise.all(
      filteredInventories.map(async (inventory) => {
        const medicine = await ctx.db.get(inventory.medicineId);
        return {
          ...inventory,
          medicineName: medicine?.name ?? "不明な薬",
          isLowStock:
            inventory.warningThreshold !== undefined &&
            inventory.currentQuantity <= inventory.warningThreshold,
        };
      }),
    );

    return success(inventoriesWithNames);
  },
});

/**
 * 残量不足の在庫一覧を取得
 */
export const getLowStockInventories = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<LowStockInventory[]>> => {
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

    // 在庫一覧を取得
    const inventories = await ctx.db
      .query("medicineInventory")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    // 残量不足のものだけフィルタリング
    const lowStockInventories = inventories.filter(
      (inv) =>
        inv.isTrackingEnabled &&
        inv.warningThreshold !== undefined &&
        inv.currentQuantity <= inv.warningThreshold,
    );

    // 薬の名前を付加
    const inventoriesWithNames = await Promise.all(
      lowStockInventories.map(async (inventory) => {
        const medicine = await ctx.db.get(inventory.medicineId);
        return {
          ...inventory,
          medicineName: medicine?.name ?? "不明な薬",
          isCritical: inventory.currentQuantity === 0,
        };
      }),
    );

    return success(inventoriesWithNames);
  },
});

/**
 * 消費履歴を取得
 */
export const getConsumptionHistory = query({
  args: {
    inventoryId: v.id("medicineInventory"),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Result<Doc<"medicineConsumptionRecords">[]>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 在庫を取得
    const inventory = await ctx.db.get(args.inventoryId);
    if (!inventory) {
      return error("在庫情報が見つかりません");
    }

    // グループメンバーか確認
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("groupId"), inventory.groupId))
      .first();

    if (!membership) {
      return error("このグループのメンバーではありません");
    }

    // 消費記録を取得（新しい順）
    const records = await ctx.db
      .query("medicineConsumptionRecords")
      .withIndex("by_inventoryId", (q) => q.eq("inventoryId", args.inventoryId))
      .order("desc")
      .take(args.limit ?? 50);

    return success(records);
  },
});

/**
 * グループの消費履歴を取得
 */
export const getGroupConsumptionHistory = query({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
    consumptionType: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("extra"),
        v.literal("lost"),
        v.literal("adjustment"),
        v.literal("refill"),
      ),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Result<ConsumptionRecordWithDetails[]>> => {
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

    // 消費記録を取得（新しい順）
    const recordsQuery = ctx.db
      .query("medicineConsumptionRecords")
      .withIndex("by_groupId_recordedAt", (q) => q.eq("groupId", args.groupId))
      .order("desc");

    const records = await recordsQuery.take(args.limit ?? 50);

    // フィルタリングと薬の名前を付加
    const filteredRecords = args.consumptionType
      ? records.filter((r) => r.consumptionType === args.consumptionType)
      : records;

    const recordsWithNames = await Promise.all(
      filteredRecords.map(async (record) => {
        const medicine = await ctx.db.get(record.medicineId);
        const inventory = await ctx.db.get(record.inventoryId);
        return {
          ...record,
          medicineName: medicine?.name ?? "不明な薬",
          unit: inventory?.unit ?? "単位不明",
        };
      }),
    );

    return success(recordsWithNames);
  },
});

/**
 * 処方箋継続中で在庫切れの薬を取得
 * 緊急度の高いアラート用
 */
export const getOutOfStockWithActivePrescription = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<Result<OutOfStockWithPrescription[]>> => {
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

    // 在庫が0の薬を取得
    const inventories = await ctx.db
      .query("medicineInventory")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    const outOfStockInventories = inventories.filter(
      (inv) => inv.isTrackingEnabled && inv.currentQuantity === 0,
    );

    const today = new Date().toISOString().split("T")[0] ?? "";

    // 処方箋継続中かどうかを確認
    const results = await Promise.all(
      outOfStockInventories.map(async (inventory) => {
        const medicine = await ctx.db.get(inventory.medicineId);
        if (!medicine || medicine.deletedAt) return null;

        let isPrescriptionActive = false;
        let prescriptionName: string | undefined;

        if (medicine.prescriptionId) {
          const prescription = await ctx.db.get(medicine.prescriptionId);
          if (prescription && !prescription.deletedAt) {
            // 処方箋が有効: isActive=true かつ (終了日なし または 終了日が今日以降)
            isPrescriptionActive =
              prescription.isActive &&
              (!prescription.endDate || prescription.endDate >= today);
            prescriptionName = prescription.name;
          }
        }

        if (!isPrescriptionActive) return null;

        return {
          ...inventory,
          medicineName: medicine.name,
          prescriptionName,
        };
      }),
    );

    return success(
      results.filter((r): r is NonNullable<typeof r> => r !== null),
    );
  },
});

/**
 * 日別の消費量を取得
 */
export const getDailyConsumption = query({
  args: {
    groupId: v.id("groups"),
    medicineId: v.id("medicines"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args): Promise<Result<DailyConsumptionSummary>> => {
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

    // 日付の範囲を計算
    const startOfDay = new Date(`${args.date}T00:00:00+09:00`).getTime();
    const endOfDay = new Date(`${args.date}T23:59:59+09:00`).getTime();

    // 消費記録を取得
    const records = await ctx.db
      .query("medicineConsumptionRecords")
      .withIndex("by_medicineId", (q) => q.eq("medicineId", args.medicineId))
      .filter((q) =>
        q.and(
          q.gte(q.field("recordedAt"), startOfDay),
          q.lte(q.field("recordedAt"), endOfDay),
        ),
      )
      .collect();

    // タイプ別に集計
    const summary = {
      scheduled: 0,
      extra: 0,
      lost: 0,
      adjustment: 0,
      refill: 0,
    };

    for (const record of records) {
      if (record.consumptionType === "refill") {
        summary.refill += Math.abs(record.quantity);
      } else if (record.consumptionType === "adjustment") {
        summary.adjustment += record.quantity;
      } else {
        summary[record.consumptionType] += record.quantity;
      }
    }

    return success({
      date: args.date,
      medicineId: args.medicineId,
      totalConsumed: summary.scheduled + summary.extra + summary.lost,
      ...summary,
    });
  },
});
