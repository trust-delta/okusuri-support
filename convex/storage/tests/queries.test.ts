import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("getPrescriptionImageUrl - 処方箋画像URL取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const prescriptionId = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });

        return await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: "creator",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(
        api.storage.queries.getPrescriptionImageUrl,
        {
          prescriptionId,
        },
      );

      expect(result).toBeNull();
    });
  });

  describe("メンバーシップ検証", () => {
    it("グループメンバーでない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });

        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: "otherUser",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.storage.queries.getPrescriptionImageUrl,
        { prescriptionId },
      );

      expect(result).toBeNull();
    });
  });

  describe("正常系", () => {
    it("処方箋が見つからない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, fakePrescriptionId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 存在しないIDを生成
        const fakePrescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "削除する処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(fakePrescriptionId);

        return { userId, fakePrescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.storage.queries.getPrescriptionImageUrl,
        { prescriptionId: fakePrescriptionId },
      );

      expect(result).toBeNull();
    });

    it("画像がない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId } = await t.run(async (ctx) => {
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
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.storage.queries.getPrescriptionImageUrl,
        { prescriptionId },
      );

      expect(result).toBeNull();
    });

    it("画像URLを取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId } = await t.run(async (ctx) => {
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

        const storageId = await ctx.storage.store(
          new Blob(["prescription image"]),
        );

        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          imageId: storageId,
        });

        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.storage.queries.getPrescriptionImageUrl,
        { prescriptionId },
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });
});

describe("getImageUrl - 汎用画像URL取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["test image"]));
      });

      const result = await t.query(api.storage.queries.getImageUrl, {
        storageId,
      });

      expect(result).toBeNull();
    });
  });

  describe("正常系", () => {
    it("画像URLを取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, storageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const storageId = await ctx.storage.store(new Blob(["test image"]));
        return { userId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.storage.queries.getImageUrl, {
        storageId,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });
});
