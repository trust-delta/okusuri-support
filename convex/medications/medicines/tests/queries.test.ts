import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getGroupMedicines - グループの薬一覧取得", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.medicines.queries.getGroupMedicines,
        { groupId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("権限チェック", () => {
    it("グループメンバーでない場合はエラーを返す", async () => {
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
        api.medications.medicines.queries.getGroupMedicines,
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
    it("グループの薬一覧を取得できる", async () => {
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

      const result = await asUser.query(
        api.medications.medicines.queries.getGroupMedicines,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.length).toBe(2);
      }
    });

    it("論理削除された薬は含まれない", async () => {
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
          name: "アクティブ薬",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "削除済み薬",
          createdBy: userId,
          createdAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.medicines.queries.getGroupMedicines,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]?.name).toBe("アクティブ薬");
      }
    });

    it("処方箋名と用量単位が含まれる", async () => {
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
          name: "内科処方",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning"],
          dosage: { amount: 1, unit: "mg" },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.medicines.queries.getGroupMedicines,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data[0]?.prescriptionName).toBe("内科処方");
        expect(result.data[0]?.dosageUnit).toBe("mg");
      }
    });
  });
});

describe("getMedicineRecordCount - 薬の服薬記録件数取得", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const medicineId = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.medicines.queries.getMedicineRecordCount,
        { medicineId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("薬の服薬記録件数を取得できる", async () => {
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
        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });
        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // 3件の記録を追加
        for (let i = 0; i < 3; i++) {
          await ctx.db.insert("medicationRecords", {
            medicineId,
            scheduleId,
            groupId,
            patientId: userId,
            timing: "morning",
            scheduledDate: `2024-06-${15 + i}`,
            status: "taken",
            recordedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.medicines.queries.getMedicineRecordCount,
        { medicineId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toBe(3);
      }
    });

    it("削除された記録は含まれない", async () => {
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
        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });
        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // アクティブな記録
        await ctx.db.insert("medicationRecords", {
          medicineId,
          scheduleId,
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // 削除された記録
        await ctx.db.insert("medicationRecords", {
          medicineId,
          scheduleId,
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2024-06-16",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
        });
        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.medicines.queries.getMedicineRecordCount,
        { medicineId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toBe(1);
      }
    });
  });
});
