import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";
import { MAX_SNOOZE_COUNT } from "../snooze";

describe("snoozeRecord - 服薬記録スヌーズ", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const recordId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        return await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes: 10,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { otherUserId, recordId } = await t.run(async (ctx) => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { otherUserId, recordId };
      });

      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes: 10,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });

    it("存在しない記録はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, dummyRecordId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 一時的に作成して削除
        const tempId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "temp",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(tempId);

        return { userId, dummyRecordId: tempId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId: dummyRecordId,
          minutes: 10,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("記録が見つかりません");
      }
    });

    it("論理削除された記録はエラーを返す", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "削除された薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes: 10,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("この記録は削除されています");
      }
    });
  });

  describe("ステータス検証", () => {
    it("taken状態の記録はスヌーズできない", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "服用済みの薬",
          status: "taken",
          takenAt: Date.now(),
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes: 10,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("未服用の記録のみスヌーズできます");
      }
    });

    it("skipped状態の記録はスヌーズできない", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "スキップした薬",
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes: 10,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("未服用の記録のみスヌーズできます");
      }
    });
  });

  describe("スヌーズ回数制限", () => {
    it("最大スヌーズ回数を超えるとエラーを返す", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "スヌーズ上限の薬",
          status: "pending",
          recordedBy: userId,
          snoozeCount: MAX_SNOOZE_COUNT, // 既に上限
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes: 10,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          `スヌーズは最大${MAX_SNOOZE_COUNT}回までです`,
        );
      }
    });
  });

  describe("正常系", () => {
    it.each([
      5, 10, 15, 30,
    ] as const)("%d分後にスヌーズできる", async (minutes) => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const beforeSnooze = Date.now();
      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const expectedMinTime = beforeSnooze + minutes * 60 * 1000;
        expect(result.data.snoozedUntil).toBeGreaterThanOrEqual(
          expectedMinTime,
        );
      }

      // DBを確認
      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updated?.snoozeCount).toBe(1);
      expect(updated?.lastSnoozedAt).toBeDefined();
      expect(updated?.snoozedUntil).toBeDefined();
    });

    it("複数回スヌーズでカウントが増える", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "pending",
          recordedBy: userId,
          snoozeCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.snoozeRecord,
        {
          recordId,
          minutes: 5,
        },
      );

      expect(result.isSuccess).toBe(true);

      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updated?.snoozeCount).toBe(2);
    });
  });
});

describe("cancelSnooze - スヌーズキャンセル", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const recordId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        return await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "pending",
          recordedBy: userId,
          snoozedUntil: Date.now() + 10 * 60 * 1000,
          snoozeCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.records.snooze.cancelSnooze,
        { recordId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { otherUserId, recordId } = await t.run(async (ctx) => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "pending",
          recordedBy: userId,
          snoozedUntil: Date.now() + 10 * 60 * 1000,
          snoozeCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { otherUserId, recordId };
      });

      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.medications.records.snooze.cancelSnooze,
        { recordId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });
  });

  describe("状態検証", () => {
    it("スヌーズされていない記録はエラーを返す", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "スヌーズなしの薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.cancelSnooze,
        { recordId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("この記録はスヌーズされていません");
      }
    });

    it("論理削除された記録はエラーを返す", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "削除された薬",
          status: "pending",
          recordedBy: userId,
          snoozedUntil: Date.now() + 10 * 60 * 1000,
          snoozeCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.cancelSnooze,
        { recordId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("この記録は削除されています");
      }
    });
  });

  describe("正常系", () => {
    it("スヌーズをキャンセルできる", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "スヌーズ中の薬",
          status: "pending",
          recordedBy: userId,
          snoozedUntil: Date.now() + 10 * 60 * 1000,
          snoozeCount: 2,
          lastSnoozedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.snooze.cancelSnooze,
        { recordId },
      );

      expect(result.isSuccess).toBe(true);

      // snoozedUntilがクリアされ、snoozeCountは維持されていることを確認
      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updated?.snoozedUntil).toBeUndefined();
      expect(updated?.snoozeCount).toBe(2); // カウントは維持
    });
  });
});
