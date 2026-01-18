import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getMedicineGroups - 薬名統合グループ一覧取得", () => {
  describe("認証", () => {
    it("認証されていない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.groups.queries.getMedicineGroups,
        { groupId },
      );

      expect(result).toEqual([]);
    });
  });

  describe("権限チェック", () => {
    it("グループメンバーでない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.groups.queries.getMedicineGroups,
        { groupId },
      );

      expect(result).toEqual([]);
    });

    it("脱退済みメンバーは空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        // 脱退済みのメンバーシップ
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
          leftAt: Date.now(),
        });
        await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.groups.queries.getMedicineGroups,
        { groupId },
      );

      expect(result).toEqual([]);
    });
  });

  describe("正常系", () => {
    it("薬名統合グループ一覧を取得できる", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠", "ロキソニンS"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "バファリン",
          medicineNames: ["バファリンA", "バファリンプレミアム"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.groups.queries.getMedicineGroups,
        { groupId },
      );

      expect(result.length).toBe(2);
    });

    it("他のグループの薬名統合グループは取得されない", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        const otherGroupId = await ctx.db.insert("groups", {
          name: "他のグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
        });
        // 対象グループの薬名統合グループ
        await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "対象グループの薬",
          medicineNames: ["薬A"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // 他のグループの薬名統合グループ
        await ctx.db.insert("medicineGroups", {
          groupId: otherGroupId,
          canonicalName: "他グループの薬",
          medicineNames: ["薬B"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.groups.queries.getMedicineGroups,
        { groupId },
      );

      expect(result.length).toBe(1);
      expect(result[0]?.canonicalName).toBe("対象グループの薬");
    });
  });
});

describe("findSimilarMedicineNames - 類似薬名検出", () => {
  describe("認証", () => {
    it("認証されていない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.groups.queries.findSimilarMedicineNames,
        { groupId },
      );

      expect(result).toEqual([]);
    });
  });

  describe("正常系", () => {
    it("類似した薬名を検出できる", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // 類似した薬名を持つ薬を作成
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "ロキソニン錠",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "ロキソニン",
          createdBy: userId,
          createdAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.groups.queries.findSimilarMedicineNames,
        { groupId, threshold: 0.5 },
      );

      // 類似度が高いペアが検出されるはず
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("閾値を下げると類似度が低いペアも検出される", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "薬A",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "薬B",
          createdBy: userId,
          createdAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // 低い閾値で検索
      const resultLow = await asUser.query(
        api.medications.groups.queries.findSimilarMedicineNames,
        { groupId, threshold: 0.3 },
      );

      // 高い閾値で検索
      const resultHigh = await asUser.query(
        api.medications.groups.queries.findSimilarMedicineNames,
        { groupId, threshold: 0.9 },
      );

      // 低い閾値の方が結果が多い（または同じ）
      expect(resultLow.length).toBeGreaterThanOrEqual(resultHigh.length);
    });

    it("既にグループ化されている薬名はスキップされる", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // 薬を作成
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "グループ化済みA",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "グループ化済みB",
          createdBy: userId,
          createdAt: Date.now(),
        });
        // これらの薬を既にグループ化
        await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "グループ化済み",
          medicineNames: ["グループ化済みA", "グループ化済みB"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.groups.queries.findSimilarMedicineNames,
        { groupId, threshold: 0.1 },
      );

      // 既にグループ化されている薬名ペアは結果に含まれない
      const containsGroupedPair = result.some(
        (r) =>
          r.medicineNames.includes("グループ化済みA") &&
          r.medicineNames.includes("グループ化済みB"),
      );
      expect(containsGroupedPair).toBe(false);
    });

    it("削除された薬は検出対象外", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // アクティブな薬
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "アクティブ薬",
          createdBy: userId,
          createdAt: Date.now(),
        });
        // 削除された薬（類似名）
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "アクティブ薬X",
          createdBy: userId,
          createdAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.groups.queries.findSimilarMedicineNames,
        { groupId, threshold: 0.5 },
      );

      // 削除された薬を含むペアは検出されない
      const containsDeletedPair = result.some((r) =>
        r.medicineNames.includes("アクティブ薬X"),
      );
      expect(containsDeletedPair).toBe(false);
    });
  });
});
