import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getUnreadAlerts - 未読アラート取得", () => {
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

      const result = await t.query(
        api.medications.alerts.queries.getUnreadAlerts,
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
      const result = await asNonMember.query(
        api.medications.alerts.queries.getUnreadAlerts,
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
    it("未読アラートのみを取得できる", async () => {
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

        // 未読アラート
        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "未読アラート1",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "out_of_stock",
          severity: "critical",
          message: "未読アラート2",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        // 既読アラート
        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "unexpected_consumption",
          severity: "info",
          message: "既読アラート",
          medicineName: "テスト薬",
          isRead: true,
          readBy: userId,
          readAt: Date.now(),
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(
        api.medications.alerts.queries.getUnreadAlerts,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((a) => !a.isRead)).toBe(true);
      }
    });

    it("未読アラートがない場合は空配列を返す", async () => {
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
      const result = await asUser.query(
        api.medications.alerts.queries.getUnreadAlerts,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(0);
      }
    });
  });
});

describe("getUnreadAlertCount - 未読アラート数取得", () => {
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

      const result = await t.query(
        api.medications.alerts.queries.getUnreadAlertCount,
        { groupId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("未読アラート数を取得できる", async () => {
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

        // 未読アラート3件
        for (let i = 0; i < 3; i++) {
          await ctx.db.insert("inventoryAlerts", {
            inventoryId,
            groupId,
            alertType: "low_stock",
            severity: "warning",
            message: `未読アラート${i + 1}`,
            medicineName: "テスト薬",
            isRead: false,
            createdAt: Date.now(),
          });
        }

        // 既読アラート2件
        for (let i = 0; i < 2; i++) {
          await ctx.db.insert("inventoryAlerts", {
            inventoryId,
            groupId,
            alertType: "out_of_stock",
            severity: "critical",
            message: `既読アラート${i + 1}`,
            medicineName: "テスト薬",
            isRead: true,
            readBy: userId,
            readAt: Date.now(),
            createdAt: Date.now(),
          });
        }

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(
        api.medications.alerts.queries.getUnreadAlertCount,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toBe(3);
      }
    });
  });
});

describe("getAlertHistory - アラート履歴取得", () => {
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

      const result = await t.query(
        api.medications.alerts.queries.getAlertHistory,
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
      const result = await asNonMember.query(
        api.medications.alerts.queries.getAlertHistory,
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
    it("アラート履歴を取得できる（既読・未読両方）", async () => {
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

        // 未読
        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "未読",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        // 既読
        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "out_of_stock",
          severity: "critical",
          message: "既読",
          medicineName: "テスト薬",
          isRead: true,
          readBy: userId,
          readAt: Date.now(),
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(
        api.medications.alerts.queries.getAlertHistory,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(2);
      }
    });

    it("alertTypeでフィルタリングできる", async () => {
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

        // low_stock
        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "low_stock1",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "low_stock",
          severity: "warning",
          message: "low_stock2",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        // overdose_warning
        await ctx.db.insert("inventoryAlerts", {
          inventoryId,
          groupId,
          alertType: "overdose_warning",
          severity: "critical",
          message: "overdose",
          medicineName: "テスト薬",
          isRead: false,
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(
        api.medications.alerts.queries.getAlertHistory,
        { groupId, alertType: "low_stock" },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((a) => a.alertType === "low_stock")).toBe(
          true,
        );
      }
    });

    it("limitで件数を制限できる", async () => {
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

        // 10件作成
        for (let i = 0; i < 10; i++) {
          await ctx.db.insert("inventoryAlerts", {
            inventoryId,
            groupId,
            alertType: "low_stock",
            severity: "warning",
            message: `アラート${i + 1}`,
            medicineName: "テスト薬",
            isRead: false,
            createdAt: Date.now() + i,
          });
        }

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(
        api.medications.alerts.queries.getAlertHistory,
        { groupId, limit: 5 },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(5);
      }
    });
  });
});
