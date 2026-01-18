import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getPrescriptions - 処方箋一覧取得", () => {
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
        api.medications.prescriptions.queries.getPrescriptions,
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
        api.medications.prescriptions.queries.getPrescriptions,
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
    it("グループの処方箋一覧を取得できる", async () => {
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
        await ctx.db.insert("prescriptions", {
          groupId,
          name: "処方箋A",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("prescriptions", {
          groupId,
          name: "処方箋B",
          startDate: "2024-02-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.prescriptions.queries.getPrescriptions,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.length).toBe(2);
        // 開始日の降順でソートされていることを確認
        expect(result.data[0]?.name).toBe("処方箋B");
        expect(result.data[1]?.name).toBe("処方箋A");
      }
    });

    it("論理削除された処方箋は含まれない", async () => {
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
        await ctx.db.insert("prescriptions", {
          groupId,
          name: "アクティブ処方箋",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("prescriptions", {
          groupId,
          name: "削除済み処方箋",
          startDate: "2024-02-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.prescriptions.queries.getPrescriptions,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]?.name).toBe("アクティブ処方箋");
      }
    });
  });
});

describe("getDeletedPrescriptions - 削除済み処方箋一覧取得", () => {
  it("削除済み処方箋を取得できる", async () => {
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
      await ctx.db.insert("prescriptions", {
        groupId,
        name: "削除済み処方箋",
        startDate: "2024-01-01",
        isActive: true,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: Date.now(),
        deletedBy: userId,
      });
      return { userId, groupId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.query(
      api.medications.prescriptions.queries.getDeletedPrescriptions,
      { groupId },
    );

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("削除済み処方箋");
    }
  });
});

describe("getPrescription - 処方箋詳細取得", () => {
  it("処方箋の詳細を取得できる", async () => {
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
        notes: "テストメモ",
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, prescriptionId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.query(
      api.medications.prescriptions.queries.getPrescription,
      { prescriptionId },
    );

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.data.name).toBe("テスト処方箋");
      expect(result.data.notes).toBe("テストメモ");
    }
  });

  it("削除された処方箋は取得できない", async () => {
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
        name: "削除済み処方箋",
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

    const result = await asUser.query(
      api.medications.prescriptions.queries.getPrescription,
      { prescriptionId },
    );

    expect(result.isSuccess).toBe(false);
    if (!result.isSuccess) {
      expect(result.errorMessage).toBe("処方箋が見つかりません");
    }
  });
});

describe("getPrescriptionMedicines - 処方箋の薬一覧取得", () => {
  it("処方箋に紐付く薬一覧を取得できる", async () => {
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
        timings: ["morning", "evening"],
        dosage: { amount: 1, unit: "錠" },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, prescriptionId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.query(
      api.medications.prescriptions.queries.getPrescriptionMedicines,
      { prescriptionId },
    );

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("テスト薬");
      expect(result.data[0]?.schedule?.timings).toEqual(["morning", "evening"]);
    }
  });
});

describe("getActiveMedicationsForDateQuery - 指定日の有効な薬取得", () => {
  it("指定日に有効な薬を取得できる", async () => {
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
      // 有効期間内の処方箋
      const prescriptionId = await ctx.db.insert("prescriptions", {
        groupId,
        name: "有効な処方箋",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        isActive: true,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const medicineId = await ctx.db.insert("medicines", {
        groupId,
        prescriptionId,
        name: "有効な薬",
        createdBy: userId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("medicationSchedules", {
        medicineId,
        groupId,
        timings: ["morning"],
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, groupId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.query(
      api.medications.prescriptions.queries.getActiveMedicationsForDateQuery,
      { groupId, date: "2024-06-15" },
    );

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.medicineName).toBe("有効な薬");
    }
  });

  it("期間外の処方箋の薬は取得されない", async () => {
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
      // 期限切れの処方箋
      const prescriptionId = await ctx.db.insert("prescriptions", {
        groupId,
        name: "期限切れ処方箋",
        startDate: "2024-01-01",
        endDate: "2024-03-31",
        isActive: true,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const medicineId = await ctx.db.insert("medicines", {
        groupId,
        prescriptionId,
        name: "期限切れの薬",
        createdBy: userId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("medicationSchedules", {
        medicineId,
        groupId,
        timings: ["morning"],
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, groupId };
    });

    const asUser = t.withIdentity({ subject: userId });

    // 2024年6月15日は期間外
    const result = await asUser.query(
      api.medications.prescriptions.queries.getActiveMedicationsForDateQuery,
      { groupId, date: "2024-06-15" },
    );

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.data.length).toBe(0);
    }
  });

  it("非アクティブな処方箋の薬は取得されない", async () => {
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
      // 無効化された処方箋
      const prescriptionId = await ctx.db.insert("prescriptions", {
        groupId,
        name: "無効化された処方箋",
        startDate: "2024-01-01",
        isActive: false, // 無効化
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const medicineId = await ctx.db.insert("medicines", {
        groupId,
        prescriptionId,
        name: "無効化された薬",
        createdBy: userId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("medicationSchedules", {
        medicineId,
        groupId,
        timings: ["morning"],
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, groupId };
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.query(
      api.medications.prescriptions.queries.getActiveMedicationsForDateQuery,
      { groupId, date: "2024-06-15" },
    );

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.data.length).toBe(0);
    }
  });
});
