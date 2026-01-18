import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("restoreMedicationRecord - 服薬記録の復元", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const historyId = await t.run(async (ctx) => {
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
        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: "user1",
          createdAt: Date.now(),
        });
        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning"],
          createdBy: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const recordId = await ctx.db.insert("medicationRecords", {
          medicineId,
          scheduleId,
          groupId,
          patientId: "user1",
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "taken",
          recordedBy: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
          medicineId,
          scheduleId,
          groupId,
          patientId: "user1",
          timing: "morning",
          scheduledDate: "2024-06-15",
          status: "taken",
          recordedBy: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          historyType: "deleted",
          archivedAt: Date.now(),
          archivedBy: "user1",
        });
      });

      const result = await t.mutation(
        api.medications.history.mutations.restoreMedicationRecord,
        { historyId },
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

      const historyId = await t.run(async (ctx) => {
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
        const recordId = await ctx.db.insert("medicationRecords", {
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
        return await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
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
          historyType: "deleted",
          archivedAt: Date.now(),
          archivedBy: "otherUser",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.history.mutations.restoreMedicationRecord,
        { historyId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });
  });

  describe("正常系 - 削除からの復元", () => {
    it("削除された記録を復元できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, historyId } = await t.run(async (ctx) => {
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
        const historyId = await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
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
          historyType: "deleted",
          archivedAt: Date.now(),
          archivedBy: userId,
        });
        return { userId, historyId, medicineId, scheduleId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.history.mutations.restoreMedicationRecord,
        { historyId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(true);
        expect(result.data.recordId).toBeDefined();

        // 復元されたレコードを確認
        const restoredRecord = await t.run(async (ctx) => {
          return await ctx.db.get(result.data.recordId);
        });
        expect(restoredRecord?.scheduledDate).toBe("2024-06-15");
        expect(restoredRecord?.status).toBe("taken");
      }
    });
  });

  describe("正常系 - 更新からの復元", () => {
    it("更新前の状態に復元できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, historyId, originalRecordId } = await t.run(
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
          const scheduleId = await ctx.db.insert("medicationSchedules", {
            medicineId,
            groupId,
            timings: ["morning"],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          // 現在のレコード（更新後の状態）
          const originalRecordId = await ctx.db.insert("medicationRecords", {
            medicineId,
            scheduleId,
            groupId,
            patientId: userId,
            timing: "morning",
            scheduledDate: "2024-06-15",
            status: "skipped", // 更新後の状態
            notes: "更新後のメモ",
            recordedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          // 履歴（更新前の状態）
          const historyId = await ctx.db.insert("medicationRecordsHistory", {
            originalRecordId,
            medicineId,
            scheduleId,
            groupId,
            patientId: userId,
            timing: "morning",
            scheduledDate: "2024-06-15",
            status: "taken", // 更新前の状態
            notes: "更新前のメモ",
            recordedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            historyType: "updated",
            archivedAt: Date.now(),
            archivedBy: userId,
          });
          return { userId, historyId, originalRecordId };
        },
      );

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.history.mutations.restoreMedicationRecord,
        { historyId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(true);
        expect(result.data.recordId).toBe(originalRecordId);

        // 復元されたレコードを確認
        const restoredRecord = await t.run(async (ctx) => {
          return await ctx.db.get(originalRecordId);
        });
        expect(restoredRecord?.status).toBe("taken"); // 更新前の状態に戻っている
        expect(restoredRecord?.notes).toBe("更新前のメモ");
      }
    });
  });

  describe("エラー系", () => {
    it("存在しない履歴IDの場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      // 適当なIDを生成（存在しない）
      const fakeHistoryId = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "ダミー",
          createdBy: userId,
          createdAt: Date.now(),
        });
        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "ダミー",
          startDate: "2024-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "ダミー",
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
        const historyId = await ctx.db.insert("medicationRecordsHistory", {
          originalRecordId: recordId,
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
          historyType: "deleted",
          archivedAt: Date.now(),
          archivedBy: userId,
        });
        // 履歴を削除して存在しないIDを作成
        await ctx.db.delete(historyId);
        return historyId;
      });

      const result = await asUser.mutation(
        api.medications.history.mutations.restoreMedicationRecord,
        { historyId: fakeHistoryId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("履歴が見つかりません");
      }
    });
  });
});
