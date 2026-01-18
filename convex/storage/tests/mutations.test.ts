import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("generateUploadUrl - アップロードURL生成", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(
        api.storage.mutations.generateUploadUrl,
        {},
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("アップロードURLを生成できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.storage.mutations.generateUploadUrl,
        {},
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe("string");
      }
    });
  });
});

describe("attachImageToPrescription - 処方箋に画像添付", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { prescriptionId, storageId } = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });

        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: "creator",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const storageId = await ctx.storage.store(new Blob(["test"]));

        return { prescriptionId, storageId };
      });

      const result = await t.mutation(
        api.storage.mutations.attachImageToPrescription,
        { prescriptionId, storageId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("バリデーション", () => {
    it("処方箋が見つからない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, fakePrescriptionId, storageId } = await t.run(
        async (ctx) => {
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

          const storageId = await ctx.storage.store(new Blob(["test"]));

          return { userId, fakePrescriptionId, storageId };
        },
      );

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.storage.mutations.attachImageToPrescription,
        { prescriptionId: fakePrescriptionId, storageId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("処方箋が見つかりません");
      }
    });

    it("削除済み処方箋には画像を添付できない", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId, storageId } = await t.run(async (ctx) => {
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
          name: "削除済み処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
        });

        const storageId = await ctx.storage.store(new Blob(["test"]));

        return { userId, prescriptionId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.storage.mutations.attachImageToPrescription,
        { prescriptionId, storageId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "削除された処方箋に画像を添付できません",
        );
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId, storageId } = await t.run(async (ctx) => {
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

        const storageId = await ctx.storage.store(new Blob(["test"]));

        return { userId, prescriptionId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.storage.mutations.attachImageToPrescription,
        { prescriptionId, storageId },
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
    it("画像を添付できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId, storageId } = await t.run(async (ctx) => {
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

        const storageId = await ctx.storage.store(new Blob(["test image"]));

        return { userId, prescriptionId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.storage.mutations.attachImageToPrescription,
        { prescriptionId, storageId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toBe(prescriptionId);

        // 処方箋が更新されたことを確認
        const prescription = await t.run(async (ctx) => {
          return await ctx.db.get(prescriptionId);
        });
        expect(prescription?.imageId).toBe(storageId);
      }
    });

    it("既存画像を差し替えできる", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId, newStorageId } = await t.run(
        async (ctx) => {
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

          // 既存画像
          const oldStorageId = await ctx.storage.store(new Blob(["old image"]));

          const prescriptionId = await ctx.db.insert("prescriptions", {
            groupId,
            name: "テスト処方箋",
            startDate: "2025-01-01",
            isActive: true,
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            imageId: oldStorageId,
          });

          const newStorageId = await ctx.storage.store(new Blob(["new image"]));

          return { userId, prescriptionId, newStorageId };
        },
      );

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.storage.mutations.attachImageToPrescription,
        { prescriptionId, storageId: newStorageId },
      );

      expect(result.isSuccess).toBe(true);

      // 新しい画像が設定されたことを確認
      const prescription = await t.run(async (ctx) => {
        return await ctx.db.get(prescriptionId);
      });
      expect(prescription?.imageId).toBe(newStorageId);
    });
  });
});

describe("removeImageFromPrescription - 処方箋から画像削除", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
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

      const result = await t.mutation(
        api.storage.mutations.removeImageFromPrescription,
        { prescriptionId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("バリデーション", () => {
    it("削除済み処方箋の画像は操作できない", async () => {
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

        const storageId = await ctx.storage.store(new Blob(["test"]));

        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "削除済み処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
          imageId: storageId,
        });

        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.storage.mutations.removeImageFromPrescription,
        { prescriptionId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "削除された処方箋の画像を操作できません",
        );
      }
    });
  });

  describe("正常系", () => {
    it("画像を削除できる", async () => {
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

        const storageId = await ctx.storage.store(new Blob(["test image"]));

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

      const result = await asUser.mutation(
        api.storage.mutations.removeImageFromPrescription,
        { prescriptionId },
      );

      expect(result.isSuccess).toBe(true);

      // 画像が削除されたことを確認
      const prescription = await t.run(async (ctx) => {
        return await ctx.db.get(prescriptionId);
      });
      expect(prescription?.imageId).toBeUndefined();
    });

    it("画像がない場合でも成功する", async () => {
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

      const result = await asUser.mutation(
        api.storage.mutations.removeImageFromPrescription,
        { prescriptionId },
      );

      expect(result.isSuccess).toBe(true);
    });
  });
});
