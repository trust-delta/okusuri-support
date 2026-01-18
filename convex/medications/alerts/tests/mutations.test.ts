import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("markAsRead - アラート既読", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const alertId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const inventoryId = await ctx.db.insert("medicineInventory", {
          medicineId,
          groupId,
          currentQuantity: 5,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "残量が少なくなっています",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.alerts.mutations.markAsRead,
        { alertId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { otherUserId, alertId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const otherUserId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const inventoryId = await ctx.db.insert("medicineInventory", {
          medicineId,
          groupId,
          currentQuantity: 5,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const alertId = await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "残量が少なくなっています",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        return { otherUserId, alertId };
      });

      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.medications.alerts.mutations.markAsRead,
        { alertId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });

    it("存在しないアラートはエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, dummyAlertId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const inventoryId = await ctx.db.insert("medicineInventory", {
          medicineId,
          groupId,
          currentQuantity: 5,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 一時的に作成して削除
        const tempId = await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "temp",
          medicineName: "temp",
          isRead: false,
          createdAt: Date.now(),
        });
        await ctx.db.delete(tempId);

        return { userId, dummyAlertId: tempId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.alerts.mutations.markAsRead,
        { alertId: dummyAlertId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("アラートが見つかりません");
      }
    });
  });

  describe("正常系", () => {
    it("アラートを既読にできる", async () => {
      const t = convexTest(schema, modules);

      const { userId, alertId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const inventoryId = await ctx.db.insert("medicineInventory", {
          medicineId,
          groupId,
          currentQuantity: 5,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const alertId = await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "残量が少なくなっています",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        return { userId, alertId };
      });

      const beforeMark = Date.now();
      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.alerts.mutations.markAsRead,
        { alertId },
      );

      expect(result.isSuccess).toBe(true);

      // DBを確認
      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(alertId);
      });

      expect(updated?.isRead).toBe(true);
      expect(updated?.readBy).toBe(userId);
      expect(updated?.readAt).toBeGreaterThanOrEqual(beforeMark);
    });
  });
});

describe("markAllAsRead - 全アラート既読", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.alerts.mutations.markAllAsRead,
        { groupId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { otherUserId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const otherUserId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { otherUserId, groupId };
      });

      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.medications.alerts.mutations.markAllAsRead,
        { groupId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });
  });

  describe("正常系", () => {
    it("グループの全未読アラートを既読にできる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, alertIds } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const inventoryId = await ctx.db.insert("medicineInventory", {
          medicineId,
          groupId,
          currentQuantity: 5,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 複数のアラートを作成
        const alert1 = await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "アラート1",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        const alert2 = await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "out_of_stock",
          severity: "critical",
          message: "アラート2",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        // 既読のアラート
        const alert3 = await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "unexpected_consumption",
          severity: "info",
          message: "アラート3",
          medicineName: "テスト薬",
          isRead: true,
          readBy: userId,
          readAt: Date.now(),
          createdAt: Date.now(),
        });

        return { userId, groupId, alertIds: [alert1, alert2, alert3] };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.alerts.mutations.markAllAsRead,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.count).toBe(2); // 未読2件のみ
      }

      // 全てが既読になっていることを確認
      const allAlerts = await t.run(async (ctx) => {
        return await Promise.all(alertIds.map((id) => ctx.db.get(id)));
      });

      for (const alert of allAlerts) {
        expect(alert?.isRead).toBe(true);
      }
    });

    it("未読アラートがない場合はcount=0を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.alerts.mutations.markAllAsRead,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.count).toBe(0);
      }
    });
  });
});
