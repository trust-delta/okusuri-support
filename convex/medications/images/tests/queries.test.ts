import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getMedicationImage - 服薬画像取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.images.queries.getMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
        },
      );

      expect(result).toBeNull();
    });
  });

  describe("メンバーシップ検証", () => {
    it("グループメンバーでない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
        },
      );

      expect(result).toBeNull();
    });
  });

  describe("正常系", () => {
    it("画像がない場合は null を返す", async () => {
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

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
        },
      );

      expect(result).toBeNull();
    });

    it("指定日・時間帯の画像を取得できる", async () => {
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

        // 画像をストレージにアップロード
        const storageId = await ctx.storage.store(new Blob(["test image"]));

        // 画像レコードを作成
        await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          notes: "テストメモ",
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
        },
      );

      expect(result).not.toBeNull();
      expect(result?.scheduledDate).toBe("2025-01-01");
      expect(result?.timing).toBe("morning");
      expect(result?.notes).toBe("テストメモ");
      expect(result?.imageUrl).toBeDefined();
    });

    it("patientIdを指定して特定患者の画像を取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, patientId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const patientId = await ctx.db.insert("users", {});
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

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        const storageId = await ctx.storage.store(new Blob(["test image"]));

        await ctx.db.insert("medicationImages", {
          groupId,
          patientId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          uploadedBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, patientId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getMedicationImage,
        {
          groupId,
          patientId,
          scheduledDate: "2025-01-01",
          timing: "morning",
        },
      );

      expect(result).not.toBeNull();
      expect(result?.timing).toBe("morning");
    });

    it("異なる時間帯の画像は取得されない", async () => {
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

        const storageId = await ctx.storage.store(new Blob(["test image"]));

        // 夜の画像を作成
        await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "evening",
          imageId: storageId,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // 朝の画像を取得しようとする
      const result = await asUser.query(
        api.medications.images.queries.getMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
        },
      );

      expect(result).toBeNull();
    });
  });
});

describe("getDayMedicationImages - 日別服薬画像取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は空オブジェクトを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.images.queries.getDayMedicationImages,
        {
          groupId,
          scheduledDate: "2025-01-01",
        },
      );

      expect(result).toEqual({});
    });
  });

  describe("メンバーシップ検証", () => {
    it("グループメンバーでない場合は空オブジェクトを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getDayMedicationImages,
        {
          groupId,
          scheduledDate: "2025-01-01",
        },
      );

      expect(result).toEqual({});
    });
  });

  describe("正常系", () => {
    it("画像がない場合は空オブジェクトを返す", async () => {
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

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getDayMedicationImages,
        {
          groupId,
          scheduledDate: "2025-01-01",
        },
      );

      expect(result).toEqual({});
    });

    it("指定日の全時間帯の画像を取得できる", async () => {
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

        // 朝の画像
        const storageId1 = await ctx.storage.store(new Blob(["morning image"]));
        await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId1,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 夜の画像
        const storageId2 = await ctx.storage.store(new Blob(["evening image"]));
        await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "evening",
          imageId: storageId2,
          notes: "夜の服薬",
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getDayMedicationImages,
        {
          groupId,
          scheduledDate: "2025-01-01",
        },
      );

      expect(Object.keys(result)).toHaveLength(2);
      expect(result.morning).toBeDefined();
      expect(result.morning?.timing).toBe("morning");
      expect(result.evening).toBeDefined();
      expect(result.evening?.timing).toBe("evening");
      expect(result.evening?.notes).toBe("夜の服薬");
    });

    it("異なる日の画像は含まれない", async () => {
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

        // 1月1日の画像
        const storageId1 = await ctx.storage.store(new Blob(["image 1"]));
        await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId1,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 1月2日の画像
        const storageId2 = await ctx.storage.store(new Blob(["image 2"]));
        await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-02",
          timing: "morning",
          imageId: storageId2,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.images.queries.getDayMedicationImages,
        {
          groupId,
          scheduledDate: "2025-01-01",
        },
      );

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.morning?.scheduledDate).toBe("2025-01-01");
    });
  });
});
