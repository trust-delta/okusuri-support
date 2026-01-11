import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { error, type Result, success } from "../../types/result";

/**
 * 薬の在庫を初期化（残量追跡を開始）
 */
export const initializeInventory = mutation({
  args: {
    medicineId: v.id("medicines"),
    initialQuantity: v.number(),
    unit: v.string(),
    warningThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Result<Id<"medicineInventory">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    // 薬を取得
    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) {
      return error("薬が見つかりません");
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

    // 既存の在庫レコードがあるか確認
    const existingInventory = await ctx.db
      .query("medicineInventory")
      .withIndex("by_medicineId", (q) => q.eq("medicineId", args.medicineId))
      .first();

    if (existingInventory) {
      return error("この薬の在庫は既に登録されています");
    }

    const now = Date.now();

    // 在庫レコードを作成
    const inventoryId = await ctx.db.insert("medicineInventory", {
      medicineId: args.medicineId,
      groupId: medicine.groupId,
      currentQuantity: args.initialQuantity,
      unit: args.unit,
      warningThreshold: args.warningThreshold,
      isTrackingEnabled: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // 初期補充として消費記録を作成
    await ctx.db.insert("medicineConsumptionRecords", {
      medicineId: args.medicineId,
      inventoryId,
      groupId: medicine.groupId,
      patientId: userId,
      consumptionType: "refill",
      quantity: -args.initialQuantity, // 負の値 = 補充
      quantityBefore: 0,
      quantityAfter: args.initialQuantity,
      reason: "初期在庫登録",
      recordedBy: userId,
      recordedAt: now,
      createdAt: now,
    });

    return success(inventoryId);
  },
});

/**
 * 在庫の残量を直接更新（調整用）
 */
export const adjustQuantity = mutation({
  args: {
    inventoryId: v.id("medicineInventory"),
    newQuantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
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

    const now = Date.now();
    const quantityDifference = args.newQuantity - inventory.currentQuantity;

    // 調整記録を作成
    await ctx.db.insert("medicineConsumptionRecords", {
      medicineId: inventory.medicineId,
      inventoryId: args.inventoryId,
      groupId: inventory.groupId,
      patientId: userId,
      consumptionType: "adjustment",
      quantity: -quantityDifference, // 正=消費、負=補充として記録
      quantityBefore: inventory.currentQuantity,
      quantityAfter: args.newQuantity,
      reason: args.reason ?? "数量調整",
      recordedBy: userId,
      recordedAt: now,
      createdAt: now,
    });

    // 在庫を更新
    await ctx.db.patch(args.inventoryId, {
      currentQuantity: args.newQuantity,
      updatedAt: now,
    });

    return success({});
  },
});

/**
 * 補充を記録
 */
export const recordRefill = mutation({
  args: {
    inventoryId: v.id("medicineInventory"),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Result<Id<"medicineConsumptionRecords">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    if (args.quantity <= 0) {
      return error("補充量は正の数である必要があります");
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

    const now = Date.now();
    const newQuantity = inventory.currentQuantity + args.quantity;

    // 補充記録を作成
    const recordId = await ctx.db.insert("medicineConsumptionRecords", {
      medicineId: inventory.medicineId,
      inventoryId: args.inventoryId,
      groupId: inventory.groupId,
      patientId: userId,
      consumptionType: "refill",
      quantity: -args.quantity, // 負の値 = 補充
      quantityBefore: inventory.currentQuantity,
      quantityAfter: newQuantity,
      reason: args.reason ?? "処方箋受け取り",
      recordedBy: userId,
      recordedAt: now,
      createdAt: now,
    });

    // 在庫を更新
    await ctx.db.patch(args.inventoryId, {
      currentQuantity: newQuantity,
      updatedAt: now,
    });

    return success(recordId);
  },
});

/**
 * 予定外消費を記録（追加服用・紛失）
 */
export const recordUnexpectedConsumption = mutation({
  args: {
    inventoryId: v.id("medicineInventory"),
    consumptionType: v.union(v.literal("extra"), v.literal("lost")),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Result<Id<"medicineConsumptionRecords">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return error("認証が必要です");
    }

    if (args.quantity <= 0) {
      return error("消費量は正の数である必要があります");
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

    // 薬名を取得
    const medicine = await ctx.db.get(inventory.medicineId);
    const medicineName = medicine?.name ?? "不明な薬";

    const now = Date.now();
    const newQuantity = Math.max(0, inventory.currentQuantity - args.quantity);

    // 消費記録を作成
    const recordId = await ctx.db.insert("medicineConsumptionRecords", {
      medicineId: inventory.medicineId,
      inventoryId: args.inventoryId,
      groupId: inventory.groupId,
      patientId: userId,
      consumptionType: args.consumptionType,
      quantity: args.quantity,
      quantityBefore: inventory.currentQuantity,
      quantityAfter: newQuantity,
      reason: args.reason,
      recordedBy: userId,
      recordedAt: now,
      createdAt: now,
    });

    // 在庫を更新
    await ctx.db.patch(args.inventoryId, {
      currentQuantity: newQuantity,
      updatedAt: now,
    });

    // 予定外消費のアラートを作成
    const alertMessage =
      args.consumptionType === "extra"
        ? `${medicineName}を${args.quantity}${inventory.unit}追加で服用しました`
        : `${medicineName}を${args.quantity}${inventory.unit}紛失しました`;

    await ctx.db.insert("inventoryAlerts", {
      inventoryId: args.inventoryId,
      groupId: inventory.groupId,
      alertType: "unexpected_consumption",
      severity: args.consumptionType === "extra" ? "warning" : "info",
      message: alertMessage,
      relatedConsumptionId: recordId,
      medicineName,
      isRead: false,
      createdAt: now,
    });

    // 残量が警告閾値以下の場合は追加アラート
    if (
      inventory.warningThreshold &&
      newQuantity <= inventory.warningThreshold
    ) {
      await ctx.db.insert("inventoryAlerts", {
        inventoryId: args.inventoryId,
        groupId: inventory.groupId,
        alertType: "low_stock",
        severity: newQuantity === 0 ? "critical" : "warning",
        message: `${medicineName}の残量が${newQuantity}${inventory.unit}になりました`,
        medicineName,
        isRead: false,
        createdAt: now,
      });
    }

    return success(recordId);
  },
});

/**
 * 警告閾値を設定
 */
export const setWarningThreshold = mutation({
  args: {
    inventoryId: v.id("medicineInventory"),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
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

    await ctx.db.patch(args.inventoryId, {
      warningThreshold: args.threshold,
      updatedAt: Date.now(),
    });

    return success({});
  },
});

/**
 * 残量追跡を無効化
 */
export const disableTracking = mutation({
  args: {
    inventoryId: v.id("medicineInventory"),
  },
  handler: async (ctx, args): Promise<Result<Record<string, never>>> => {
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

    await ctx.db.patch(args.inventoryId, {
      isTrackingEnabled: false,
      updatedAt: Date.now(),
    });

    return success({});
  },
});
