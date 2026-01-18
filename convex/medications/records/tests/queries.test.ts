import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getTodayRecords - 指定日の服薬記録取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.records.queries.getTodayRecords,
        {
          groupId,
          scheduledDate: "2025-01-01",
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
        api.medications.records.queries.getTodayRecords,
        {
          groupId,
          scheduledDate: "2025-01-01",
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

  describe("権限検証", () => {
    it("patientは他のユーザーの記録を閲覧できない", async () => {
      const t = convexTest(schema, modules);

      const { userId, otherUserId, groupId } = await t.run(async (ctx) => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, otherUserId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getTodayRecords,
        {
          groupId,
          scheduledDate: "2025-01-01",
          patientId: otherUserId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "他のユーザーの記録を閲覧する権限がありません",
        );
      }
    });

    it("supporterは他のユーザーの記録を閲覧できる", async () => {
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

        return { userId, patientId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getTodayRecords,
        {
          groupId,
          scheduledDate: "2025-01-01",
          patientId,
        },
      );

      expect(result.isSuccess).toBe(true);
    });
  });

  describe("正常系", () => {
    it("指定日の記録を取得できる", async () => {
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
          startDate: "2025-01-01",
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

        // 1月1日の記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 1月2日の記録（別の日）
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-02",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getTodayRecords,
        {
          groupId,
          scheduledDate: "2025-01-01",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.scheduledDate).toBe("2025-01-01");
      }
    });

    it("削除済みの記録は含まれない", async () => {
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
          startDate: "2025-01-01",
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

        // 削除済みの記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getTodayRecords,
        {
          groupId,
          scheduledDate: "2025-01-01",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("patientIdを指定して特定ユーザーの記録のみ取得できる", async () => {
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

        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2025-01-01",
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

        // 患者の記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 別のユーザーの記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, patientId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getTodayRecords,
        {
          groupId,
          scheduledDate: "2025-01-01",
          patientId,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.patientId).toBe(patientId);
      }
    });
  });
});

describe("getMonthlyRecords - 指定月の服薬記録取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.records.queries.getMonthlyRecords,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("指定月の記録を全て取得できる", async () => {
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
          startDate: "2025-01-01",
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

        // 1月の記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-15",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-31",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 2月の記録（除外されるべき）
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-02-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getMonthlyRecords,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(3);
        // 全て1月の記録であることを確認
        for (const record of result.data) {
          expect(record.scheduledDate).toMatch(/^2025-01-/);
        }
      }
    });

    it("うるう年の2月も正しく処理できる", async () => {
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

        // 2024年2月29日（うるう年）の記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2024-02-29",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getMonthlyRecords,
        {
          groupId,
          year: 2024,
          month: 2,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.scheduledDate).toBe("2024-02-29");
      }
    });
  });
});

describe("getMonthlyStats - 月間統計取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.records.queries.getMonthlyStats,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("統計情報を計算できる", async () => {
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
          startDate: "2025-01-01",
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

        // taken: 2回
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-02",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // skipped: 1回
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-03",
          timing: "morning",
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getMonthlyStats,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.totalTaken).toBe(2);
        expect(result.data.totalSkipped).toBe(1);
      }
    });

    it("日別統計を計算できる", async () => {
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
          startDate: "2025-01-01",
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
          timings: ["morning", "evening"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 1月1日: 2回服用（100%）
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "evening",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getMonthlyStats,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const jan1Stats = result.data.dailyStats["2025-01-01"];
        expect(jan1Stats?.taken).toBe(2);
        expect(jan1Stats?.rate).toBe(100);
      }
    });

    it("タイミング別統計を計算できる", async () => {
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
          startDate: "2025-01-01",
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
          timings: ["morning", "evening"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 朝: taken
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 夜: skipped
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "evening",
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getMonthlyStats,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.timingStats.morning.taken).toBe(1);
        expect(result.data.timingStats.evening.skipped).toBe(1);
      }
    });

    it("頓服を別枠で集計する", async () => {
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
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "頓服薬",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["asNeeded"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 頓服の記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "asNeeded",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-02",
          timing: "asNeeded",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getMonthlyStats,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.asNeeded.taken).toBe(2);
        expect(result.data.asNeeded.total).toBe(2);
        // 頓服は定期服用の統計には含まれない
        expect(result.data.totalTaken).toBe(0);
      }
    });

    it("服用率を正しく計算する", async () => {
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
          startDate: "2025-01-01",
          endDate: "2025-01-02", // 2日間のみ有効
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

        // 2日中1日だけ服用 = 50%
        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-02",
          timing: "morning",
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.records.queries.getMonthlyStats,
        {
          groupId,
          year: 2025,
          month: 1,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.adherenceRate).toBe(50);
      }
    });
  });
});
