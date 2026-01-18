import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("getRecordHistory - 服薬記録履歴の取得", () => {
  describe("認証", () => {
    it("認証されていない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.query(
        api.medications.history.queries.getRecordHistory,
        { groupId },
      );

      expect(result).toEqual([]);
    });
  });

  describe("recordIdによる取得", () => {
    it("特定の記録の履歴を取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, recordId } = await t.run(async (ctx) => {
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
        // 履歴を2件作成
        await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
          medicineId,
          scheduleId,
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          historyType: "updated",
          archivedAt: Date.now() - 1000,
          archivedBy: userId,
        });
        await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
          medicineId,
          scheduleId,
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          historyType: "updated",
          archivedAt: Date.now(),
          archivedBy: userId,
        });
        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.history.queries.getRecordHistory,
        { recordId },
      );

      expect(result.length).toBe(2);
    });

    it("グループメンバーでない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const recordId = await t.run(async (ctx) => {
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
        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning"],
          createdBy: "otherUser",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert("medicationRecords", {
          medicineId,
          scheduleId,
          groupId,
          patientId: "otherUser",
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "taken",
          recordedBy: "otherUser",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.history.queries.getRecordHistory,
        { recordId },
      );

      expect(result).toEqual([]);
    });
  });

  describe("groupIdによる取得", () => {
    it("グループの履歴を取得できる", async () => {
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
        await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
          medicineId,
          scheduleId,
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          historyType: "updated",
          archivedAt: Date.now(),
          archivedBy: userId,
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.history.queries.getRecordHistory,
        { groupId },
      );

      expect(result.length).toBe(1);
    });

    it("脱退済みメンバーはグループ履歴を取得できない", async () => {
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
        api.medications.history.queries.getRecordHistory,
        { groupId },
      );

      expect(result).toEqual([]);
    });
  });

  describe("patientIdによる取得", () => {
    it("患者の履歴を取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, patientId } = await t.run(async (ctx) => {
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
          patientId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "taken",
          recordedBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
          medicineId,
          scheduleId,
          groupId,
          patientId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "skipped",
          recordedBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          historyType: "updated",
          archivedAt: Date.now(),
          archivedBy: userId,
        });
        return { userId, patientId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.history.queries.getRecordHistory,
        { patientId },
      );

      expect(result.length).toBe(1);
    });

    it("所属していないグループの履歴は取得できない", async () => {
      const t = convexTest(schema, modules);

      const { userId, patientId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const patientId = await ctx.db.insert("users", {});
        // userIdはグループに所属していない
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: patientId,
          createdAt: Date.now(),
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
          startDate: "2024-01-01",
          isActive: true,
          createdBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: patientId,
          createdAt: Date.now(),
        });
        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning"],
          createdBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const recordId = await ctx.db.insert("medicationRecords", {
          medicineId,
          scheduleId,
          groupId,
          patientId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "taken",
          recordedBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
          medicineId,
          scheduleId,
          groupId,
          patientId,
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "skipped",
          recordedBy: patientId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          historyType: "updated",
          archivedAt: Date.now(),
          archivedBy: patientId,
        });
        return { userId, patientId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.history.queries.getRecordHistory,
        { patientId },
      );

      expect(result).toEqual([]);
    });
  });

  describe("パラメータなしの場合", () => {
    it("空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.medications.history.queries.getRecordHistory,
        {},
      );

      expect(result).toEqual([]);
    });
  });
});
