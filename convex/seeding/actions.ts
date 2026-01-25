import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server";
import {
  generateMedicationRecords,
  getAuthenticatedUserId,
  getDateString,
  isTestUser,
  sampleMedicines,
  samplePrescriptions,
  TEST_EMAILS,
} from "./seed_data";

/**
 * テストユーザーのサンプルデータ投入状況を取得
 */
export const getSeedStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isAuthenticated: false, isTestUser: false, hasSeedData: false };
    }

    const email = identity.email;
    if (!isTestUser(email)) {
      return { isAuthenticated: true, isTestUser: false, hasSeedData: false };
    }

    // テストユーザーのグループを確認
    const userId = identity.subject;
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!membership) {
      return { isAuthenticated: true, isTestUser: true, hasSeedData: false };
    }

    // グループ内のデータを確認
    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", membership.groupId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return {
      isAuthenticated: true,
      isTestUser: true,
      hasSeedData: prescriptions.length > 0,
      groupId: membership.groupId,
      prescriptionCount: prescriptions.length,
    };
  },
});

/**
 * テストユーザー用サンプルデータを投入
 * テストユーザーでログイン中のみ実行可能
 */
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const email = identity.email;
    if (!isTestUser(email)) {
      throw new Error("この機能はテストユーザー専用です（test@example.com等）");
    }

    const userId = identity.subject;
    const now = Date.now();

    // 1. テストグループを作成（既存があれば取得）
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    let groupId: Id<"groups">;

    if (membership) {
      groupId = membership.groupId;
    } else {
      // グループを新規作成
      groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        description: "ブラウザ検証用サンプルグループ",
        createdBy: userId,
        createdAt: now,
      });

      // メンバーとして追加（patient役割）
      await ctx.db.insert("groupMembers", {
        groupId,
        userId,
        role: "patient",
        joinedAt: now,
      });

      // 通知設定を作成
      await ctx.db.insert("groupNotificationSettings", {
        groupId,
        morningTime: 480, // 8:00
        noonTime: 720, // 12:00
        eveningTime: 1080, // 18:00
        bedtimeTime: 1260, // 21:00
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. 既存のサンプルデータを削除（クリーンな状態から）
    await deleteGroupData(ctx, groupId, userId, now);

    // 3. 処方箋を作成
    const prescriptionIds: Id<"prescriptions">[] = [];
    for (const prescription of samplePrescriptions) {
      const id = await ctx.db.insert("prescriptions", {
        groupId,
        name: prescription.name,
        notes: prescription.notes,
        startDate: getDateString(prescription.dayOffset),
        endDate: getDateString(prescription.endDayOffset),
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      prescriptionIds.push(id);
    }

    // 4. 薬剤・スケジュール・在庫を作成
    for (const medicine of sampleMedicines) {
      const prescriptionId = prescriptionIds[medicine.prescriptionIndex];

      // 薬剤を作成
      const medicineId = await ctx.db.insert("medicines", {
        groupId,
        prescriptionId,
        name: medicine.name,
        description: medicine.description,
        createdBy: userId,
        createdAt: now,
      });

      // スケジュールを作成
      const scheduleId = await ctx.db.insert("medicationSchedules", {
        medicineId,
        groupId,
        timings: [...medicine.timings],
        dosage: medicine.dosage,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // 在庫を作成
      await ctx.db.insert("medicineInventory", {
        medicineId,
        groupId,
        currentQuantity: medicine.inventory.quantity,
        unit: medicine.dosage.unit,
        warningThreshold: medicine.inventory.warningThreshold,
        isTrackingEnabled: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // 服薬記録を作成（各タイミングごと）
      for (const timing of medicine.timings) {
        const records = generateMedicationRecords(
          scheduleId as string,
          userId,
          timing,
        );
        for (const record of records) {
          await ctx.db.insert("medicationRecords", {
            medicineId,
            scheduleId,
            groupId,
            patientId: userId,
            timing,
            scheduledDate: record.scheduledDate,
            status: record.status,
            takenAt: record.takenAt,
            recordedBy: userId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return {
      success: true,
      message: "サンプルデータを投入しました",
      groupId,
      prescriptionCount: prescriptionIds.length,
      medicineCount: sampleMedicines.length,
    };
  },
});

/**
 * テストユーザーのデータをリセット（初期状態に戻す）
 * グループ自体は残し、処方箋・薬剤・記録等を削除
 */
export const resetTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const email = identity.email;
    if (!isTestUser(email)) {
      throw new Error("この機能はテストユーザー専用です（test@example.com等）");
    }

    const userId = identity.subject;
    const now = Date.now();

    // テストユーザーのグループを取得
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!membership) {
      return {
        success: true,
        message: "削除するデータがありません",
      };
    }

    const groupId = membership.groupId;

    // グループ内のデータを削除
    const deleted = await deleteGroupData(ctx, groupId, userId, now);

    return {
      success: true,
      message: "テストデータをリセットしました",
      ...deleted,
    };
  },
});

/**
 * グループ内のデータを削除（内部関数）
 */
async function deleteGroupData(
  ctx: MutationCtx,
  groupId: Id<"groups">,
  userId: string,
  now: number,
) {
  let deletedPrescriptions = 0;
  let deletedMedicines = 0;
  let deletedSchedules = 0;
  let deletedRecords = 0;
  let deletedInventory = 0;
  let deletedAlerts = 0;
  let deletedConsumptions = 0;

  // 服薬記録を削除
  const records = await ctx.db
    .query("medicationRecords")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  for (const record of records) {
    await ctx.db.patch(record._id, { deletedAt: now, deletedBy: userId });
    deletedRecords++;
  }

  // 在庫アラートを削除
  const alerts = await ctx.db
    .query("inventoryAlerts")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .collect();

  for (const alert of alerts) {
    await ctx.db.delete(alert._id);
    deletedAlerts++;
  }

  // 消費記録を削除
  const consumptions = await ctx.db
    .query("medicineConsumptionRecords")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .collect();

  for (const consumption of consumptions) {
    await ctx.db.delete(consumption._id);
    deletedConsumptions++;
  }

  // 在庫を削除
  const inventories = await ctx.db
    .query("medicineInventory")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .collect();

  for (const inventory of inventories) {
    await ctx.db.delete(inventory._id);
    deletedInventory++;
  }

  // スケジュールを削除
  const schedules = await ctx.db
    .query("medicationSchedules")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  for (const schedule of schedules) {
    await ctx.db.patch(schedule._id, { deletedAt: now, deletedBy: userId });
    deletedSchedules++;
  }

  // 薬剤を削除
  const medicines = await ctx.db
    .query("medicines")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  for (const medicine of medicines) {
    await ctx.db.patch(medicine._id, { deletedAt: now, deletedBy: userId });
    deletedMedicines++;
  }

  // 処方箋を削除
  const prescriptions = await ctx.db
    .query("prescriptions")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  for (const prescription of prescriptions) {
    await ctx.db.patch(prescription._id, { deletedAt: now, deletedBy: userId });
    deletedPrescriptions++;
  }

  return {
    deletedPrescriptions,
    deletedMedicines,
    deletedSchedules,
    deletedRecords,
    deletedInventory,
    deletedAlerts,
    deletedConsumptions,
  };
}

// ================================================
// CLI用 Internal Functions (npx convex run で使用)
// ================================================

/**
 * authAccountsテーブルのデバッグ情報を取得（CLI用）
 * Usage: npx convex run seeding/actions:internal_debugAuthAccounts --args '{"email":"test@example.com"}'
 */
export const internal_debugAuthAccounts = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    // メールアドレスに関連するアカウントを探す
    const matchingAccounts = accounts.filter((a) => {
      const accountData = a as unknown as Record<string, unknown>;
      return (
        a.providerAccountId === email ||
        a.providerAccountId?.includes(email) ||
        accountData.email === email ||
        JSON.stringify(accountData).includes(email)
      );
    });

    return {
      totalAccounts: accounts.length,
      matchingAccounts: matchingAccounts.map((a) => ({
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        userId: a.userId,
        // 全フィールドを確認
        allFields: Object.keys(a),
      })),
      // 全アカウントのprovider一覧
      allProviders: [...new Set(accounts.map((a) => a.provider))],
    };
  },
});

/**
 * テストユーザーの情報を取得（CLI用）
 * Usage: npx convex run seeding/actions:internal_getTestUserInfo --args '{"email":"test@example.com"}'
 */
export const internal_getTestUserInfo = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (!isTestUser(email)) {
      return { error: "Not a test user email" };
    }

    // authAccountsからユーザーを検索（複数のproviderを確認）
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find((a) => {
      const accountData = a as unknown as Record<string, unknown>;
      // resend-otp または password プロバイダーで検索
      const isMatchingProvider =
        a.provider === "resend-otp" || a.provider === "password";
      const isMatchingEmail =
        a.providerAccountId === email || accountData.email === email;
      return isMatchingProvider && isMatchingEmail;
    });

    if (!account) {
      return { error: "User not found. Please login first." };
    }

    const userId = account.userId;

    // グループ情報を取得
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    return {
      userId,
      email,
      hasGroup: !!membership,
      groupId: membership?.groupId,
    };
  },
});

/**
 * CLI用サンプルデータ投入
 * Usage: npx convex run seeding/actions:internal_seedTestData --args '{"email":"test@example.com"}'
 */
export const internal_seedTestData = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (!isTestUser(email)) {
      throw new Error("この機能はテストユーザー専用です（test@example.com等）");
    }

    // authAccountsからユーザーを検索（複数のproviderを確認）
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find((a) => {
      const accountData = a as unknown as Record<string, unknown>;
      // resend-otp または password プロバイダーで検索
      const isMatchingProvider =
        a.provider === "resend-otp" || a.provider === "password";
      const isMatchingEmail =
        a.providerAccountId === email || accountData.email === email;
      return isMatchingProvider && isMatchingEmail;
    });

    if (!account) {
      throw new Error(
        "ユーザーが見つかりません。先にブラウザからログインしてください。",
      );
    }

    const userId = account.userId;
    const now = Date.now();

    // 1. テストグループを作成（既存があれば取得）
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    let groupId: Id<"groups">;

    if (membership) {
      groupId = membership.groupId;
    } else {
      // グループを新規作成
      groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        description: "ブラウザ検証用サンプルグループ",
        createdBy: userId,
        createdAt: now,
      });

      // メンバーとして追加（patient役割）
      await ctx.db.insert("groupMembers", {
        groupId,
        userId,
        role: "patient",
        joinedAt: now,
      });

      // 通知設定を作成
      await ctx.db.insert("groupNotificationSettings", {
        groupId,
        morningTime: 480,
        noonTime: 720,
        eveningTime: 1080,
        bedtimeTime: 1260,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. 既存のサンプルデータを削除
    await deleteGroupData(ctx, groupId, userId, now);

    // 3. 処方箋を作成
    const prescriptionIds: Id<"prescriptions">[] = [];
    for (const prescription of samplePrescriptions) {
      const id = await ctx.db.insert("prescriptions", {
        groupId,
        name: prescription.name,
        notes: prescription.notes,
        startDate: getDateString(prescription.dayOffset),
        endDate: getDateString(prescription.endDayOffset),
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      prescriptionIds.push(id);
    }

    // 4. 薬剤・スケジュール・在庫を作成
    for (const medicine of sampleMedicines) {
      const prescriptionId = prescriptionIds[medicine.prescriptionIndex];

      const medicineId = await ctx.db.insert("medicines", {
        groupId,
        prescriptionId,
        name: medicine.name,
        description: medicine.description,
        createdBy: userId,
        createdAt: now,
      });

      const scheduleId = await ctx.db.insert("medicationSchedules", {
        medicineId,
        groupId,
        timings: [...medicine.timings],
        dosage: medicine.dosage,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("medicineInventory", {
        medicineId,
        groupId,
        currentQuantity: medicine.inventory.quantity,
        unit: medicine.dosage.unit,
        warningThreshold: medicine.inventory.warningThreshold,
        isTrackingEnabled: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      for (const timing of medicine.timings) {
        const records = generateMedicationRecords(
          scheduleId as string,
          userId,
          timing,
        );
        for (const record of records) {
          await ctx.db.insert("medicationRecords", {
            medicineId,
            scheduleId,
            groupId,
            patientId: userId,
            timing,
            scheduledDate: record.scheduledDate,
            status: record.status,
            takenAt: record.takenAt,
            recordedBy: userId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return {
      success: true,
      message: "サンプルデータを投入しました",
      email,
      groupId,
      prescriptionCount: prescriptionIds.length,
      medicineCount: sampleMedicines.length,
    };
  },
});

/**
 * CLI用テストデータリセット
 * Usage: npx convex run seeding/actions:internal_resetTestData --args '{"email":"test@example.com"}'
 */
export const internal_resetTestData = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (!isTestUser(email)) {
      throw new Error("この機能はテストユーザー専用です（test@example.com等）");
    }

    // authAccountsからユーザーを検索（複数のproviderを確認）
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find((a) => {
      const accountData = a as unknown as Record<string, unknown>;
      // resend-otp または password プロバイダーで検索
      const isMatchingProvider =
        a.provider === "resend-otp" || a.provider === "password";
      const isMatchingEmail =
        a.providerAccountId === email || accountData.email === email;
      return isMatchingProvider && isMatchingEmail;
    });

    if (!account) {
      return {
        success: true,
        message: "ユーザーが存在しないため、リセット不要です",
      };
    }

    const userId = account.userId;
    const now = Date.now();

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!membership) {
      return {
        success: true,
        message: "削除するデータがありません",
      };
    }

    const deleted = await deleteGroupData(ctx, membership.groupId, userId, now);

    return {
      success: true,
      message: "テストデータをリセットしました",
      email,
      ...deleted,
    };
  },
});
