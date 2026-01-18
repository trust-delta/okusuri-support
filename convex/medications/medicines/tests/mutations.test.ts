import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("deleteMedicine - 薬削除", () => {
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

      const result = await t.mutation(
        api.medications.medicines.mutations.deleteMedicine,
        { medicineId },
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

      const medicineId = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: "otherUser",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.deleteMedicine,
        { medicineId },
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
    it("薬を論理削除できる", async () => {
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
        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.deleteMedicine,
        { medicineId },
      );

      expect(result.isSuccess).toBe(true);

      const medicine = await t.run(async (ctx) => {
        return await ctx.db.get(medicineId);
      });
      expect(medicine?.deletedAt).toBeDefined();
      expect(medicine?.deletedBy).toBe(userId);
    });

    it("関連するスケジュールも論理削除される", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId, scheduleId } = await t.run(async (ctx) => {
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
        return { userId, medicineId, scheduleId };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(
        api.medications.medicines.mutations.deleteMedicine,
        { medicineId },
      );

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });
      expect(schedule?.deletedAt).toBeDefined();
    });

    it("関連する服薬記録も論理削除される", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId, recordId } = await t.run(async (ctx) => {
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
        const recordId = await ctx.db.insert("medicationRecords", {
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
        return { userId, medicineId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(
        api.medications.medicines.mutations.deleteMedicine,
        { medicineId },
      );

      const record = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });
      expect(record?.deletedAt).toBeDefined();
    });
  });

  describe("エラー系", () => {
    it("既に削除されている薬は削除できない", async () => {
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
          deletedAt: Date.now(),
          deletedBy: userId,
        });
        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.deleteMedicine,
        { medicineId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("この薬は既に削除されています");
      }
    });
  });
});

describe("updateMedicine - 薬更新", () => {
  describe("正常系", () => {
    it("薬の名前を更新できる", async () => {
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
          name: "元の薬名",
          createdBy: userId,
          createdAt: Date.now(),
        });
        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.updateMedicine,
        {
          medicineId,
          name: "新しい薬名",
        },
      );

      expect(result.isSuccess).toBe(true);

      const medicine = await t.run(async (ctx) => {
        return await ctx.db.get(medicineId);
      });
      expect(medicine?.name).toBe("新しい薬名");
    });

    it("薬の用量を更新できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId, scheduleId } = await t.run(async (ctx) => {
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
          dosage: { amount: 1, unit: "錠" },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, medicineId, scheduleId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.updateMedicine,
        {
          medicineId,
          dosage: { amount: 2, unit: "錠" },
        },
      );

      expect(result.isSuccess).toBe(true);

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });
      expect(schedule?.dosage).toEqual({ amount: 2, unit: "錠" });
    });

    it("薬のタイミングを更新できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId, scheduleId } = await t.run(async (ctx) => {
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
        return { userId, medicineId, scheduleId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.updateMedicine,
        {
          medicineId,
          timings: ["morning", "evening"],
        },
      );

      expect(result.isSuccess).toBe(true);

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });
      expect(schedule?.timings).toEqual(["morning", "evening"]);
    });

    it("用量をクリアできる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineId, scheduleId } = await t.run(async (ctx) => {
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
          dosage: { amount: 1, unit: "錠" },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, medicineId, scheduleId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.updateMedicine,
        {
          medicineId,
          clearDosage: true,
        },
      );

      expect(result.isSuccess).toBe(true);

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });
      expect(schedule?.dosage).toBeUndefined();
    });
  });

  describe("エラー系", () => {
    it("削除された薬は更新できない", async () => {
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
          deletedAt: Date.now(),
          deletedBy: userId,
        });
        return { userId, medicineId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.updateMedicine,
        {
          medicineId,
          name: "新しい名前",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("削除された薬は編集できません");
      }
    });
  });
});

describe("addMedicineToPrescription - 処方箋に薬を追加", () => {
  describe("正常系", () => {
    it("処方箋に薬を追加できる", async () => {
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
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.addMedicineToPrescription,
        {
          prescriptionId,
          name: "追加薬",
          timings: ["morning", "evening"],
          dosage: { amount: 1, unit: "錠" },
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const medicine = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(medicine?.name).toBe("追加薬");

        // スケジュールも作成されていることを確認
        const schedule = await t.run(async (ctx) => {
          return await ctx.db
            .query("medicationSchedules")
            .withIndex("by_medicineId", (q) => q.eq("medicineId", result.data))
            .first();
        });
        expect(schedule?.timings).toEqual(["morning", "evening"]);
        expect(schedule?.dosage).toEqual({ amount: 1, unit: "錠" });
      }
    });
  });

  describe("バリデーション", () => {
    it("空の薬名は追加できない", async () => {
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
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.addMedicineToPrescription,
        {
          prescriptionId,
          name: "   ",
          timings: ["morning"],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("薬名を入力してください");
      }
    });

    it("タイミング未選択は追加できない", async () => {
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
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.addMedicineToPrescription,
        {
          prescriptionId,
          name: "テスト薬",
          timings: [],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "服用タイミングを1つ以上選択してください",
        );
      }
    });

    it("削除された処方箋には薬を追加できない", async () => {
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
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
        });
        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.medicines.mutations.addMedicineToPrescription,
        {
          prescriptionId,
          name: "テスト薬",
          timings: ["morning"],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "削除された処方箋には薬を追加できません",
        );
      }
    });
  });
});
