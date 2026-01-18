import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("createPrescription - 処方箋作成", () => {
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

      const result = await t.mutation(
        api.medications.prescriptions.mutations.createPrescription,
        {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
        },
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

      const result = await asUser.mutation(
        api.medications.prescriptions.mutations.createPrescription,
        {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
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
    it("処方箋を作成できる", async () => {
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

      const result = await asUser.mutation(
        api.medications.prescriptions.mutations.createPrescription,
        {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const prescription = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(prescription?.name).toBe("テスト処方箋");
        expect(prescription?.startDate).toBe("2024-01-01");
        expect(prescription?.isActive).toBe(true);
      }
    });

    it("終了日付きで処方箋を作成できる", async () => {
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

      const result = await asUser.mutation(
        api.medications.prescriptions.mutations.createPrescription,
        {
          groupId,
          name: "期限付き処方箋",
          startDate: "2024-01-01",
          endDate: "2024-03-31",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const prescription = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(prescription?.endDate).toBe("2024-03-31");
      }
    });

    it("薬と一緒に処方箋を作成できる", async () => {
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

      const result = await asUser.mutation(
        api.medications.prescriptions.mutations.createPrescription,
        {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-01-01",
          medicines: [
            {
              name: "テスト薬",
              timings: ["morning", "evening"],
              dosage: { amount: 1, unit: "錠" },
            },
          ],
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const medicines = await t.run(async (ctx) => {
          return await ctx.db
            .query("medicines")
            .withIndex("by_prescriptionId", (q) =>
              q.eq("prescriptionId", result.data),
            )
            .collect();
        });
        expect(medicines.length).toBe(1);
        expect(medicines[0]?.name).toBe("テスト薬");

        // スケジュールが作成されていることを確認
        const schedule = await t.run(async (ctx) => {
          return await ctx.db
            .query("medicationSchedules")
            .withIndex("by_medicineId", (q) =>
              q.eq("medicineId", medicines[0]?._id as Id<"medicines">),
            )
            .first();
        });
        expect(schedule?.timings).toEqual(["morning", "evening"]);
        expect(schedule?.dosage).toEqual({ amount: 1, unit: "錠" });
      }
    });
  });

  describe("バリデーション", () => {
    it("終了日が開始日より前の場合はエラーを返す", async () => {
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

      const result = await asUser.mutation(
        api.medications.prescriptions.mutations.createPrescription,
        {
          groupId,
          name: "テスト処方箋",
          startDate: "2024-03-01",
          endDate: "2024-01-01",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "終了日は開始日より後である必要があります",
        );
      }
    });
  });
});

describe("updatePrescription - 処方箋更新", () => {
  describe("正常系", () => {
    it("処方箋を更新できる", async () => {
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
          name: "元の名前",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.prescriptions.mutations.updatePrescription,
        {
          prescriptionId,
          name: "更新後の名前",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const prescription = await t.run(async (ctx) => {
          return await ctx.db.get(prescriptionId);
        });
        expect(prescription?.name).toBe("更新後の名前");
      }
    });

    it("終了日を削除できる", async () => {
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
          endDate: "2024-03-31",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.prescriptions.mutations.updatePrescription,
        {
          prescriptionId,
          clearEndDate: true,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const prescription = await t.run(async (ctx) => {
          return await ctx.db.get(prescriptionId);
        });
        expect(prescription?.endDate).toBeUndefined();
      }
    });
  });
});

describe("deletePrescription - 処方箋削除", () => {
  describe("正常系", () => {
    it("処方箋を論理削除できる", async () => {
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
        api.medications.prescriptions.mutations.deletePrescription,
        {
          prescriptionId,
        },
      );

      expect(result.isSuccess).toBe(true);

      const prescription = await t.run(async (ctx) => {
        return await ctx.db.get(prescriptionId);
      });
      expect(prescription?.deletedAt).toBeDefined();
      expect(prescription?.deletedBy).toBe(userId);
    });

    it("関連する薬も論理削除される", async () => {
      const t = convexTest(schema, modules);

      const { userId, prescriptionId, medicineId } = await t.run(
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
          return { userId, prescriptionId, medicineId };
        },
      );

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(
        api.medications.prescriptions.mutations.deletePrescription,
        {
          prescriptionId,
        },
      );

      const medicine = await t.run(async (ctx) => {
        return await ctx.db.get(medicineId);
      });
      expect(medicine?.deletedAt).toBeDefined();
    });
  });

  describe("エラー系", () => {
    it("既に削除されている処方箋は削除できない", async () => {
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
        api.medications.prescriptions.mutations.deletePrescription,
        {
          prescriptionId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("この処方箋は既に削除されています");
      }
    });
  });
});

describe("deactivatePrescription / activatePrescription - 処方箋有効/無効化", () => {
  it("処方箋を無効化できる", async () => {
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
      api.medications.prescriptions.mutations.deactivatePrescription,
      {
        prescriptionId,
      },
    );

    expect(result.isSuccess).toBe(true);

    const prescription = await t.run(async (ctx) => {
      return await ctx.db.get(prescriptionId);
    });
    expect(prescription?.isActive).toBe(false);
  });

  it("処方箋を有効化できる", async () => {
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
        isActive: false,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, prescriptionId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.mutation(
      api.medications.prescriptions.mutations.activatePrescription,
      {
        prescriptionId,
      },
    );

    expect(result.isSuccess).toBe(true);

    const prescription = await t.run(async (ctx) => {
      return await ctx.db.get(prescriptionId);
    });
    expect(prescription?.isActive).toBe(true);
  });
});

describe("restorePrescription - 処方箋復元", () => {
  it("論理削除された処方箋を復元できる", async () => {
    const t = convexTest(schema, modules);

    const { userId, prescriptionId, medicineId } = await t.run(async (ctx) => {
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
      const now = Date.now();
      const prescriptionId = await ctx.db.insert("prescriptions", {
        groupId,
        name: "テスト処方箋",
        startDate: "2024-01-01",
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
        deletedBy: userId,
      });
      const medicineId = await ctx.db.insert("medicines", {
        groupId,
        prescriptionId,
        name: "テスト薬",
        createdBy: userId,
        createdAt: now,
        deletedAt: now,
        deletedBy: userId,
      });
      return { userId, prescriptionId, medicineId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.mutation(
      api.medications.prescriptions.mutations.restorePrescription,
      {
        prescriptionId,
      },
    );

    expect(result.isSuccess).toBe(true);

    const prescription = await t.run(async (ctx) => {
      return await ctx.db.get(prescriptionId);
    });
    expect(prescription?.deletedAt).toBeUndefined();

    const medicine = await t.run(async (ctx) => {
      return await ctx.db.get(medicineId);
    });
    expect(medicine?.deletedAt).toBeUndefined();
  });
});

describe("duplicatePrescription - 処方箋複製", () => {
  it("処方箋を複製できる", async () => {
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
        name: "元の処方箋",
        startDate: "2024-01-01",
        isActive: true,
        notes: "元のメモ",
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const medicineId = await ctx.db.insert("medicines", {
        groupId,
        prescriptionId,
        name: "元の薬",
        createdBy: userId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("medicationSchedules", {
        medicineId,
        groupId,
        timings: ["morning"],
        dosage: { amount: 1, unit: "錠" },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, prescriptionId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.mutation(
      api.medications.prescriptions.mutations.duplicatePrescription,
      {
        prescriptionId,
        startDate: "2024-04-01",
      },
    );

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      const newPrescription = await t.run(async (ctx) => {
        return await ctx.db.get(result.data);
      });
      expect(newPrescription?.name).toBe("元の処方箋のコピー");
      expect(newPrescription?.startDate).toBe("2024-04-01");
      expect(newPrescription?.notes).toBe("元のメモ");

      // 薬も複製されていることを確認
      const medicines = await t.run(async (ctx) => {
        return await ctx.db
          .query("medicines")
          .withIndex("by_prescriptionId", (q) =>
            q.eq("prescriptionId", result.data),
          )
          .collect();
      });
      expect(medicines.length).toBe(1);
      expect(medicines[0]?.name).toBe("元の薬");
    }
  });
});
