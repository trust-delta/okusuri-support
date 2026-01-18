import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getMedicationStatsByPeriod - 期間別薬剤統計取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は空のデータを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toEqual([]);
      expect(result.summary.totalMedicines).toBe(0);
      expect(result.summary.totalDoses).toBe(0);
      expect(result.period.days).toBe(0);
    });
  });

  describe("グループメンバーシップ検証", () => {
    it("グループメンバーでない場合は空のデータを返す", async () => {
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
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toEqual([]);
      expect(result.summary.totalMedicines).toBe(0);
    });

    it("脱退済みメンバーは空のデータを返す", async () => {
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

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toEqual([]);
    });
  });

  describe("正常系", () => {
    it("薬がない場合は空の統計を返す", async () => {
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
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toEqual([]);
      expect(result.summary.totalMedicines).toBe(0);
      expect(result.summary.totalDoses).toBe(0);
      expect(result.summary.overallAdherenceRate).toBe(0);
      expect(result.period.days).toBe(7);
    });

    it("基本的な統計を計算できる", async () => {
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

        await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning", "evening"],
          dosage: { amount: 1, unit: "錠" },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0]?.medicineName).toBe("テスト薬");
      // 7日間 × 2回/日 = 14回
      expect(result.medicines[0]?.totalDoses).toBe(14);
      expect(result.summary.totalMedicines).toBe(1);
      expect(result.summary.totalDoses).toBe(14);
    });

    it("服用記録を正しく集計する", async () => {
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

        // 服用記録を作成（3日分）
        // 服用: 2回
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

        // スキップ: 1回
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
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-03",
        },
      );

      expect(result.medicines[0]?.takenCount).toBe(2);
      expect(result.medicines[0]?.skippedCount).toBe(1);
      expect(result.summary.totalTaken).toBe(2);
      expect(result.summary.totalSkipped).toBe(1);
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

        // 朝の記録
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

        // 夜の記録
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
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-01",
        },
      );

      expect(result.timingStats.morning?.taken).toBe(1);
      expect(result.timingStats.morning?.total).toBe(1);
      expect(result.timingStats.evening?.skipped).toBe(1);
      expect(result.timingStats.evening?.total).toBe(1);
    });

    it("頓服（asNeeded）の統計を別枠で計算する", async () => {
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
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.asNeeded.taken).toBe(2);
      expect(result.asNeeded.total).toBe(2);
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

        // 2日間で1回だけ服用 = 50%
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
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-02",
        },
      );

      expect(result.medicines[0]?.adherenceRate).toBe(50);
      expect(result.summary.overallAdherenceRate).toBe(50);
    });

    it("期間情報を正しく返す", async () => {
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
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-31",
        },
      );

      expect(result.period.startDate).toBe("2025-01-01");
      expect(result.period.endDate).toBe("2025-01-31");
      expect(result.period.days).toBe(31);
    });

    it("特定の薬でフィルタリングできる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, medicine1Id } = await t.run(async (ctx) => {
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

        // 薬1
        const medicine1Id = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "薬A",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationSchedules", {
          medicineId: medicine1Id,
          groupId,
          timings: ["morning"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 薬2
        const medicine2Id = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "薬B",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationSchedules", {
          medicineId: medicine2Id,
          groupId,
          timings: ["evening"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId, medicine1Id };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          medicineId: medicine1Id,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0]?.medicineName).toBe("薬A");
    });

    it("削除済みの処方箋は除外される", async () => {
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

        // 削除済みの処方箋
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
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toHaveLength(0);
    });

    it("非アクティブな処方箋は除外される", async () => {
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

        // 非アクティブな処方箋
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "非アクティブ処方箋",
          startDate: "2025-01-01",
          isActive: false,
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
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.statistics.queries.getMedicationStatsByPeriod,
        {
          groupId,
          startDate: "2025-01-01",
          endDate: "2025-01-07",
        },
      );

      expect(result.medicines).toHaveLength(0);
    });
  });
});
