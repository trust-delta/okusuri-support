import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("initializeInventory - 残量追跡初期化", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const medicineId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        return await ctx.db.insert("medicines", {
          groupId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.inventory.mutations.initializeInventory,
        {
          medicineId,
          initialQuantity: 30,
          unit: "錠",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { otherUserId, medicineId } = await t.run(async (ctx) => {
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

        return { otherUserId, medicineId };
      });

      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.medications.inventory.mutations.initializeInventory,
        {
          medicineId,
          initialQuantity: 30,
          unit: "錠",
        },
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
    it("残量追跡を開始できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId, groupId } = await t.run(async (ctx) => {
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
          name: "ロキソニン",
          createdBy: userId,
          createdAt: Date.now(),
        });

        return { userId, medicineId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.inventory.mutations.initializeInventory,
        {
          medicineId,
          initialQuantity: 30,
          unit: "錠",
          warningThreshold: 10,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const inventory = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });

        expect(inventory).toBeDefined();
        expect(inventory?.medicineId).toBe(medicineId);
        expect(inventory?.groupId).toBe(groupId);
        expect(inventory?.currentQuantity).toBe(30);
        expect(inventory?.unit).toBe("錠");
        expect(inventory?.warningThreshold).toBe(10);
        expect(inventory?.isTrackingEnabled).toBe(true);
      }
    });

    it("警告閾値なしで残量追跡を開始できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId } = await t.run(async (ctx) => {
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

        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.inventory.mutations.initializeInventory,
        {
          medicineId,
          initialQuantity: 50,
          unit: "カプセル",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const inventory = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });

        expect(inventory?.warningThreshold).toBeUndefined();
      }
    });

    it("既に追跡中の場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId } = await t.run(async (ctx) => {
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

        // 既に残量追跡を開始
        await ctx.db.insert("medicineInventory", {
          medicineId,
          groupId,
          currentQuantity: 30,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.inventory.mutations.initializeInventory,
        {
          medicineId,
          initialQuantity: 50,
          unit: "錠",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("この薬の在庫は既に登録されています");
      }
    });
  });
});

describe("recordUnexpectedConsumption - 予定外消費記録", () => {
  describe("正常系", () => {
    it("追加服用を記録できる", async () => {
      const t = convexTest(schema, modules);

      const {
        userId,
        inventoryId,
        medicineId: _medicineId,
        groupId: _groupId,
      } = await t.run(async (ctx) => {
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
          name: "ロキソニン",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const inventoryId = await ctx.db.insert("medicineInventory", {
          medicineId,
          groupId,
          currentQuantity: 30,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, inventoryId, medicineId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.inventory.mutations.recordUnexpectedConsumption,
        {
          inventoryId,
          quantity: 2,
          consumptionType: "extra",
          reason: "頭痛がひどかったため追加服用",
        },
      );

      expect(result.isSuccess).toBe(true);

      // 残量が減っていることを確認
      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.currentQuantity).toBe(28);

      // 消費記録が作成されていることを確認
      const consumptionRecord = await t.run(async (ctx) => {
        return await ctx.db
          .query("medicineConsumptionRecords")
          .withIndex("by_inventoryId", (q) => q.eq("inventoryId", inventoryId))
          .first();
      });

      expect(consumptionRecord).toBeDefined();
      expect(consumptionRecord?.consumptionType).toBe("extra");
      expect(consumptionRecord?.quantity).toBe(2);
      expect(consumptionRecord?.quantityBefore).toBe(30);
      expect(consumptionRecord?.quantityAfter).toBe(28);
      expect(consumptionRecord?.reason).toBe("頭痛がひどかったため追加服用");

      // アラートが作成されていることを確認
      const alert = await t.run(async (ctx) => {
        return await ctx.db
          .query("inventoryAlerts")
          .withIndex("by_inventoryId", (q) => q.eq("inventoryId", inventoryId))
          .first();
      });

      expect(alert).toBeDefined();
      expect(alert?.alertType).toBe("unexpected_consumption");
    });

    it("紛失を記録できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, inventoryId } = await t.run(async (ctx) => {
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
          currentQuantity: 20,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, inventoryId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.inventory.mutations.recordUnexpectedConsumption,
        {
          inventoryId,
          quantity: 5,
          consumptionType: "lost",
          reason: "外出中に落としてしまった",
        },
      );

      expect(result.isSuccess).toBe(true);

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.currentQuantity).toBe(15);
    });
  });
});

describe("recordRefill - 補充記録", () => {
  describe("正常系", () => {
    it("薬の補充を記録できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, inventoryId } = await t.run(async (ctx) => {
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

        return { userId, inventoryId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.inventory.mutations.recordRefill,
        {
          inventoryId,
          quantity: 30,
        },
      );

      expect(result.isSuccess).toBe(true);

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.currentQuantity).toBe(35);

      // 消費記録が作成されていることを確認
      const consumptionRecord = await t.run(async (ctx) => {
        return await ctx.db
          .query("medicineConsumptionRecords")
          .withIndex("by_inventoryId", (q) => q.eq("inventoryId", inventoryId))
          .first();
      });

      expect(consumptionRecord).toBeDefined();
      expect(consumptionRecord?.consumptionType).toBe("refill");
      // 負の値 = 補充（在庫増加）
      expect(consumptionRecord?.quantity).toBe(-30);
      expect(consumptionRecord?.quantityBefore).toBe(5);
      expect(consumptionRecord?.quantityAfter).toBe(35);
    });
  });
});

describe("adjustQuantity - 残量調整", () => {
  describe("正常系", () => {
    it("残量を調整できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, inventoryId } = await t.run(async (ctx) => {
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
          currentQuantity: 25,
          unit: "錠",
          isTrackingEnabled: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, inventoryId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.inventory.mutations.adjustQuantity,
        {
          inventoryId,
          newQuantity: 20,
          reason: "棚卸しで確認したところ5錠少なかった",
        },
      );

      expect(result.isSuccess).toBe(true);

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.currentQuantity).toBe(20);

      // 消費記録が作成されていることを確認
      const consumptionRecord = await t.run(async (ctx) => {
        return await ctx.db
          .query("medicineConsumptionRecords")
          .withIndex("by_inventoryId", (q) => q.eq("inventoryId", inventoryId))
          .first();
      });

      expect(consumptionRecord).toBeDefined();
      expect(consumptionRecord?.consumptionType).toBe("adjustment");
      expect(consumptionRecord?.quantity).toBe(5);
      expect(consumptionRecord?.quantityBefore).toBe(25);
      expect(consumptionRecord?.quantityAfter).toBe(20);
    });
  });
});
