import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("attachMedicationImage - 服薬画像添付", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { groupId, storageId } = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
        const storageId = await ctx.storage.store(new Blob(["test"]));
        return { groupId, storageId };
      });

      const result = await t.mutation(
        api.medications.images.mutations.attachMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          storageId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("メンバーシップ検証", () => {
    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, storageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
        const storageId = await ctx.storage.store(new Blob(["test"]));
        return { userId, groupId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.attachMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          storageId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });

    it("グループに患者がいない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, storageId } = await t.run(async (ctx) => {
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

        const storageId = await ctx.storage.store(new Blob(["test"]));
        return { userId, groupId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.attachMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          storageId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("グループに患者が登録されていません");
      }
    });
  });

  describe("正常系", () => {
    it("新規画像を添付できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, storageId } = await t.run(async (ctx) => {
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
        return { userId, groupId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.attachMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          storageId,
          notes: "テストメモ",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        // 画像レコードが作成されたことを確認
        const image = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(image?.scheduledDate).toBe("2025-01-01");
        expect(image?.timing).toBe("morning");
        expect(image?.notes).toBe("テストメモ");
      }
    });

    it("既存画像を差し替えできる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, newStorageId, existingImageId } = await t.run(
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
          const existingImageId = await ctx.db.insert("medicationImages", {
            groupId,
            patientId: userId,
            scheduledDate: "2025-01-01",
            timing: "morning",
            imageId: oldStorageId,
            notes: "古いメモ",
            uploadedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // 新しい画像
          const newStorageId = await ctx.storage.store(new Blob(["new image"]));

          return { userId, groupId, newStorageId, existingImageId };
        },
      );

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.attachMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          storageId: newStorageId,
          notes: "新しいメモ",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        // 同じIDが返される
        expect(result.data).toBe(existingImageId);

        // 画像が更新されたことを確認
        const image = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(image?.imageId).toBe(newStorageId);
        expect(image?.notes).toBe("新しいメモ");
      }
    });

    it("supporterも画像を添付できる", async () => {
      const t = convexTest(schema, modules);

      const { supporterId, groupId, storageId } = await t.run(async (ctx) => {
        const patientId = await ctx.db.insert("users", {});
        const supporterId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: supporterId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: supporterId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        const storageId = await ctx.storage.store(new Blob(["test image"]));
        return { supporterId, groupId, storageId };
      });

      const asUser = t.withIdentity({ subject: supporterId });

      const result = await asUser.mutation(
        api.medications.images.mutations.attachMedicationImage,
        {
          groupId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          storageId,
        },
      );

      expect(result.isSuccess).toBe(true);
    });
  });
});

describe("removeMedicationImage - 服薬画像削除", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const imageId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const storageId = await ctx.storage.store(new Blob(["test"]));
        return await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.images.mutations.removeMedicationImage,
        { imageId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("画像を削除できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, imageId } = await t.run(async (ctx) => {
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
        const imageId = await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, imageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.removeMedicationImage,
        { imageId },
      );

      expect(result.isSuccess).toBe(true);

      // 画像レコードが削除されたことを確認
      const deletedImage = await t.run(async (ctx) => {
        return await ctx.db.get(imageId);
      });
      expect(deletedImage).toBeNull();
    });

    it("存在しない画像を削除しようとするとエラー", async () => {
      const t = convexTest(schema, modules);

      const { userId, fakeImageId } = await t.run(async (ctx) => {
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

        // 存在しないIDを生成
        const storageId = await ctx.storage.store(new Blob(["test"]));
        const fakeImageId = await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(fakeImageId);

        return { userId, fakeImageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.removeMedicationImage,
        { imageId: fakeImageId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("画像が見つかりません");
      }
    });
  });
});

describe("updateMedicationImageNotes - 服薬画像メモ更新", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const imageId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const storageId = await ctx.storage.store(new Blob(["test"]));
        return await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.images.mutations.updateMedicationImageNotes,
        { imageId, notes: "新しいメモ" },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("メモを更新できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, imageId } = await t.run(async (ctx) => {
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
        const imageId = await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          notes: "古いメモ",
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, imageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.updateMedicationImageNotes,
        { imageId, notes: "新しいメモ" },
      );

      expect(result.isSuccess).toBe(true);

      // メモが更新されたことを確認
      const image = await t.run(async (ctx) => {
        return await ctx.db.get(imageId);
      });
      expect(image?.notes).toBe("新しいメモ");
    });

    it("メモを削除できる（undefinedに設定）", async () => {
      const t = convexTest(schema, modules);

      const { userId, imageId } = await t.run(async (ctx) => {
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
        const imageId = await ctx.db.insert("medicationImages", {
          groupId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          imageId: storageId,
          notes: "古いメモ",
          uploadedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, imageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.images.mutations.updateMedicationImageNotes,
        { imageId, notes: undefined },
      );

      expect(result.isSuccess).toBe(true);

      // メモが削除されたことを確認
      const image = await t.run(async (ctx) => {
        return await ctx.db.get(imageId);
      });
      expect(image?.notes).toBeUndefined();
    });
  });
});
