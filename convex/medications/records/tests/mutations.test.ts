import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("recordSimpleMedication - 服薬記録作成", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      // グループを作成
      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      // 認証なしで服薬記録作成を試行
      const result = await t.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "taken",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      // ユーザーとグループを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "他人のグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      // メンバーでないグループの服薬記録作成を試行
      const asNonMember = t.withIdentity({ subject: userId });
      const result = await asNonMember.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "taken",
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

  describe("バリデーション", () => {
    it("薬剤情報がない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      // ユーザーとグループを作成
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          status: "taken",
          // medicineId も simpleMedicineName もなし
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("薬剤情報が必要です");
      }
    });
  });

  describe("patientIdの決定ロジック", () => {
    it("患者メンバーがいる場合は患者のIDが設定される", async () => {
      const t = convexTest(schema, modules);

      // ユーザー（サポーター）と患者を作成
      const { supporterId, patientId, groupId } = await t.run(async (ctx) => {
        const supporterId = await ctx.db.insert("users", {});
        const patientId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: supporterId,
          createdAt: Date.now(),
        });

        // サポーターとして参加
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: supporterId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 患者として参加
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { supporterId, patientId, groupId };
      });

      const asSupporter = t.withIdentity({ subject: supporterId });
      const result = await asSupporter.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "taken",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        // DBレコードを確認して患者IDが設定されていることを検証
        const record = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });

        expect(record).toBeDefined();
        expect(record?.patientId).toBe(patientId);
        expect(record?.recordedBy).toBe(supporterId);
      }
    });

    it("患者メンバーがいない場合は記録者のIDが設定される", async () => {
      const t = convexTest(schema, modules);

      // ユーザー（サポーターのみ）を作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // サポーターとして参加（患者なし）
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "taken",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const record = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });

        expect(record).toBeDefined();
        expect(record?.patientId).toBe(userId);
        expect(record?.recordedBy).toBe(userId);
      }
    });
  });

  describe("正常系", () => {
    it("簡易記録（simpleMedicineName）で服薬記録を作成できる", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const beforeCreation = Date.now();

      const result = await asUser.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "朝の薬",
          status: "taken",
          notes: "食後に服用",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const record = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });

        expect(record).toBeDefined();
        expect(record?.simpleMedicineName).toBe("朝の薬");
        expect(record?.medicineId).toBeUndefined();
        expect(record?.timing).toBe("morning");
        expect(record?.scheduledDate).toBe("2025-01-15");
        expect(record?.status).toBe("taken");
        expect(record?.notes).toBe("食後に服用");
        expect(record?.takenAt).toBeGreaterThanOrEqual(beforeCreation);
      }
    });

    it("処方箋ベース（medicineId）で服薬記録を作成できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, medicineId, scheduleId } = await t.run(
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
            role: "supporter",
            joinedAt: Date.now(),
          });

          // 薬剤を作成
          const medicineId = await ctx.db.insert("medicines", {
            groupId,
            name: "ロキソニン",
            createdBy: userId,
            createdAt: Date.now(),
          });

          // スケジュールを作成
          const scheduleId = await ctx.db.insert("medicationSchedules", {
            medicineId,
            groupId,
            timings: ["morning", "noon", "evening"],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { userId, groupId, medicineId, scheduleId };
        },
      );

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          medicineId,
          scheduleId,
          status: "taken",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const record = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });

        expect(record).toBeDefined();
        expect(record?.medicineId).toBe(medicineId);
        expect(record?.scheduleId).toBe(scheduleId);
        expect(record?.simpleMedicineName).toBeUndefined();
      }
    });

    it("スキップ状態の服薬記録を作成できる", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.recordSimpleMedication,
        {
          groupId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "skipped",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const record = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });

        expect(record).toBeDefined();
        expect(record?.status).toBe("skipped");
        expect(record?.takenAt).toBeUndefined();
      }
    });

    it("全てのタイミングで記録を作成できる", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const timings = [
        "morning",
        "noon",
        "evening",
        "bedtime",
        "asNeeded",
      ] as const;
      const asUser = t.withIdentity({ subject: userId });

      for (const timing of timings) {
        const result = await asUser.mutation(
          api.medications.records.mutations.recordSimpleMedication,
          {
            groupId,
            timing,
            scheduledDate: "2025-01-15",
            simpleMedicineName: `${timing}の薬`,
            status: "taken",
          },
        );

        expect(result.isSuccess).toBe(true);
        if (result.isSuccess) {
          const record = await t.run(async (ctx) => {
            return await ctx.db.get(result.data);
          });
          expect(record?.timing).toBe(timing);
        }
      }
    });
  });
});

describe("updateMedicationRecord - 服薬記録更新", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      // レコードを作成
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
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // 認証なしで更新を試行
      const result = await t.mutation(
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          status: "skipped",
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
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { otherUserId, recordId };
      });

      // メンバーでないユーザーで更新を試行
      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          status: "skipped",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });

    it("存在しない記録の更新はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      // 存在しないIDで更新を試行（型安全のためダミーのIDを生成）
      const dummyRecordId = await t.run(async (ctx) => {
        const tempId = await ctx.db.insert("medicationRecords", {
          groupId: await ctx.db.insert("groups", {
            name: "temp",
            createdBy: userId,
            createdAt: Date.now(),
          }),
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "temp",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(tempId);
        return tempId;
      });

      const result = await asUser.mutation(
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId: dummyRecordId,
          status: "skipped",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("記録が見つかりません");
      }
    });
  });

  describe("履歴保存", () => {
    it("更新時に履歴テーブルにレコードが保存される", async () => {
      const t = convexTest(schema, modules);

      const { userId, _groupId, recordId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const _groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: _groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId: _groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "テスト薬",
          status: "taken",
          takenAt: Date.now(),
          recordedBy: userId,
          notes: "元のメモ",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, _groupId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          status: "skipped",
          notes: "更新後のメモ",
        },
      );

      expect(result.isSuccess).toBe(true);

      // 履歴レコードを確認
      const history = await t.run(async (ctx) => {
        return await ctx.db
          .query("medicationRecordsHistory")
          .withIndex("by_originalRecordId", (q) =>
            q.eq("originalRecordId", recordId),
          )
          .first();
      });

      expect(history).toBeDefined();
      expect(history?.historyType).toBe("updated");
      expect(history?.status).toBe("taken"); // 元のステータス
      expect(history?.notes).toBe("元のメモ"); // 元のメモ
      expect(history?.archivedBy).toBe(userId);
    });
  });

  describe("正常系", () => {
    it("ステータスを更新できる", async () => {
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
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          status: "skipped",
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedRecord = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updatedRecord?.status).toBe("skipped");
      expect(updatedRecord?.takenAt).toBeUndefined();
    });

    it("メモを更新できる", async () => {
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
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          notes: "新しいメモ",
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedRecord = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updatedRecord?.notes).toBe("新しいメモ");
    });

    it("薬名を更新できる", async () => {
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
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          simpleMedicineName: "新しい薬名",
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedRecord = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updatedRecord?.simpleMedicineName).toBe("新しい薬名");
    });

    it("takenからskippedへの変更でtakenAtがクリアされる", async () => {
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
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          status: "skipped",
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedRecord = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updatedRecord?.status).toBe("skipped");
      expect(updatedRecord?.takenAt).toBeUndefined();
    });

    it("skippedからtakenへの変更でtakenAtが設定される", async () => {
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
          status: "skipped",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const beforeUpdate = Date.now();
      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.updateMedicationRecord,
        {
          recordId,
          status: "taken",
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedRecord = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(updatedRecord?.status).toBe("taken");
      expect(updatedRecord?.takenAt).toBeGreaterThanOrEqual(beforeUpdate);
    });
  });
});

describe("deleteMedicationRecord - 服薬記録削除", () => {
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
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.records.mutations.deleteMedicationRecord,
        {
          recordId,
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
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { otherUserId, recordId };
      });

      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.medications.records.mutations.deleteMedicationRecord,
        {
          recordId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });

    it("存在しない記録の削除はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      // 存在しないIDで削除を試行
      const dummyRecordId = await t.run(async (ctx) => {
        const tempId = await ctx.db.insert("medicationRecords", {
          groupId: await ctx.db.insert("groups", {
            name: "temp",
            createdBy: userId,
            createdAt: Date.now(),
          }),
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "temp",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(tempId);
        return tempId;
      });

      const result = await asUser.mutation(
        api.medications.records.mutations.deleteMedicationRecord,
        {
          recordId: dummyRecordId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("記録が見つかりません");
      }
    });
  });

  describe("履歴保存", () => {
    it("削除時に履歴テーブルにレコードが保存される", async () => {
      const t = convexTest(schema, modules);

      const { userId, recordId, originalData } = await t.run(async (ctx) => {
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

        const now = Date.now();
        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "削除される薬",
          status: "taken",
          takenAt: now,
          recordedBy: userId,
          notes: "削除前のメモ",
          createdAt: now,
          updatedAt: now,
        });

        return {
          userId,
          recordId,
          originalData: {
            groupId,
            patientId: userId,
            timing: "morning" as const,
            scheduledDate: "2025-01-15",
            simpleMedicineName: "削除される薬",
            status: "taken" as const,
            notes: "削除前のメモ",
          },
        };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.deleteMedicationRecord,
        {
          recordId,
        },
      );

      expect(result.isSuccess).toBe(true);

      // 履歴レコードを確認
      const history = await t.run(async (ctx) => {
        return await ctx.db
          .query("medicationRecordsHistory")
          .withIndex("by_originalRecordId", (q) =>
            q.eq("originalRecordId", recordId),
          )
          .first();
      });

      expect(history).toBeDefined();
      expect(history?.historyType).toBe("deleted");
      expect(history?.originalRecordId).toBe(recordId);
      expect(history?.simpleMedicineName).toBe(originalData.simpleMedicineName);
      expect(history?.status).toBe(originalData.status);
      expect(history?.notes).toBe(originalData.notes);
      expect(history?.archivedBy).toBe(userId);
    });
  });

  describe("正常系", () => {
    it("服薬記録を削除できる", async () => {
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
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.medications.records.mutations.deleteMedicationRecord,
        {
          recordId,
        },
      );

      expect(result.isSuccess).toBe(true);

      // 元のレコードが削除されていることを確認
      const deletedRecord = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });

      expect(deletedRecord).toBeNull();
    });

    it("削除後も履歴から元のデータを参照できる", async () => {
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
          timing: "evening",
          scheduledDate: "2025-01-20",
          simpleMedicineName: "夕方の薬",
          status: "skipped",
          recordedBy: userId,
          notes: "体調不良のため",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });
      await asUser.mutation(
        api.medications.records.mutations.deleteMedicationRecord,
        {
          recordId,
        },
      );

      // 履歴から元のデータを確認
      const history = await t.run(async (ctx) => {
        return await ctx.db
          .query("medicationRecordsHistory")
          .withIndex("by_originalRecordId", (q) =>
            q.eq("originalRecordId", recordId),
          )
          .first();
      });

      expect(history).toBeDefined();
      expect(history?.timing).toBe("evening");
      expect(history?.scheduledDate).toBe("2025-01-20");
      expect(history?.simpleMedicineName).toBe("夕方の薬");
      expect(history?.status).toBe("skipped");
      expect(history?.notes).toBe("体調不良のため");
    });
  });
});
