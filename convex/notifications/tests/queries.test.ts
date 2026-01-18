import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../../schema";
import { modules } from "../../test.setup";

// Convex型インスタンス化の深度制限を回避 - 動的インポート
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { internal } = require("../../_generated/api");

describe("getPendingRecordsByTiming - 未服薬記録取得", () => {
  describe("基本的な取得", () => {
    it("指定日時・タイミングのpending記録を取得できる", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // pending状態の記録を作成
        await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "朝の薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.medicineName).toBe("朝の薬");
      expect(result[0]?.timing).toBe("morning");
    });

    it("別のタイミングの記録は取得しない", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 朝のpending記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "朝の薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 昼のpending記録
        await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "noon",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "昼の薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.medicineName).toBe("朝の薬");
    });

    it("別の日付の記録は取得しない", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-14",
          simpleMedicineName: "昨日の薬",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("ステータスフィルタリング", () => {
    it("taken状態の記録は取得しない", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
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
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(0);
    });

    it("skipped状態の記録は取得しない", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
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
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(0);
    });

    it("論理削除された記録は取得しない", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
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
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("スヌーズ処理", () => {
    it("スヌーズ中の記録は取得しない", async () => {
      const t = convexTest(schema, modules);
      const futureTime = Date.now() + 30 * 60 * 1000; // 30分後

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "スヌーズ中の薬",
          status: "pending",
          recordedBy: userId,
          snoozedUntil: futureTime,
          snoozeCount: 1,
          lastSnoozedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(0);
    });

    it("スヌーズ期限切れの記録は取得する", async () => {
      const t = convexTest(schema, modules);
      const pastTime = Date.now() - 30 * 60 * 1000; // 30分前

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          simpleMedicineName: "スヌーズ期限切れの薬",
          status: "pending",
          recordedBy: userId,
          snoozedUntil: pastTime,
          snoozeCount: 1,
          lastSnoozedAt: pastTime - 30 * 60 * 1000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.medicineName).toBe("スヌーズ期限切れの薬");
      expect(result[0]?.snoozeCount).toBe(1);
    });
  });

  describe("薬剤情報の抽出", () => {
    it("処方箋ベースの記録から薬名と用量を抽出できる", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          name: "ロキソニン",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning", "noon", "evening"],
          dosage: { amount: 60, unit: "mg" },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("medicationRecords", {
          groupId,
          patientId: userId,
          medicineId,
          scheduleId,
          timing: "morning",
          scheduledDate: "2025-01-15",
          status: "pending",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: "2025-01-15",
          timing: "morning",
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.medicineName).toBe("ロキソニン");
      expect(result[0]?.dosage).toEqual({ amount: 60, unit: "mg" });
    });
  });
});

describe("getSnoozedRecordsDue - スヌーズ解除記録取得", () => {
  it("スヌーズ解除時刻を過ぎた記録を取得できる", async () => {
    const t = convexTest(schema, modules);
    const pastTime = Date.now() - 30 * 60 * 1000; // 30分前

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      const groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("medicationRecords", {
        groupId,
        patientId: userId,
        timing: "morning",
        scheduledDate: "2025-01-15",
        simpleMedicineName: "スヌーズ解除待ちの薬",
        status: "pending",
        recordedBy: userId,
        snoozedUntil: pastTime,
        snoozeCount: 1,
        lastSnoozedAt: pastTime - 30 * 60 * 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(
      internal.notifications.queries.getSnoozedRecordsDue,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.medicineName).toBe("スヌーズ解除待ちの薬");
    expect(result[0]?.snoozeCount).toBe(1);
  });

  it("まだスヌーズ中の記録は取得しない", async () => {
    const t = convexTest(schema, modules);
    const futureTime = Date.now() + 30 * 60 * 1000; // 30分後

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      const groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("medicationRecords", {
        groupId,
        patientId: userId,
        timing: "morning",
        scheduledDate: "2025-01-15",
        simpleMedicineName: "まだスヌーズ中の薬",
        status: "pending",
        recordedBy: userId,
        snoozedUntil: futureTime,
        snoozeCount: 1,
        lastSnoozedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(
      internal.notifications.queries.getSnoozedRecordsDue,
      {},
    );

    expect(result).toHaveLength(0);
  });

  it("スヌーズ設定のない記録は取得しない", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      const groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("medicationRecords", {
        groupId,
        patientId: userId,
        timing: "morning",
        scheduledDate: "2025-01-15",
        simpleMedicineName: "通常の薬",
        status: "pending",
        recordedBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(
      internal.notifications.queries.getSnoozedRecordsDue,
      {},
    );

    expect(result).toHaveLength(0);
  });

  it("論理削除された記録は取得しない", async () => {
    const t = convexTest(schema, modules);
    const pastTime = Date.now() - 30 * 60 * 1000;

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      const groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("medicationRecords", {
        groupId,
        patientId: userId,
        timing: "morning",
        scheduledDate: "2025-01-15",
        simpleMedicineName: "削除されたスヌーズ記録",
        status: "pending",
        recordedBy: userId,
        snoozedUntil: pastTime,
        snoozeCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: Date.now(),
        deletedBy: userId,
      });
    });

    const result = await t.query(
      internal.notifications.queries.getSnoozedRecordsDue,
      {},
    );

    expect(result).toHaveLength(0);
  });

  it("taken状態の記録は取得しない", async () => {
    const t = convexTest(schema, modules);
    const pastTime = Date.now() - 30 * 60 * 1000;

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      const groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("medicationRecords", {
        groupId,
        patientId: userId,
        timing: "morning",
        scheduledDate: "2025-01-15",
        simpleMedicineName: "服用済みのスヌーズ記録",
        status: "taken",
        takenAt: Date.now(),
        recordedBy: userId,
        snoozedUntil: pastTime,
        snoozeCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(
      internal.notifications.queries.getSnoozedRecordsDue,
      {},
    );

    expect(result).toHaveLength(0);
  });
});

describe("getGroupNotificationSettings - グループ通知設定取得", () => {
  it("グループの通知設定を取得できる", async () => {
    const t = convexTest(schema, modules);

    const groupId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      const groupId = await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("groupNotificationSettings", {
        groupId,
        morningTime: 420, // 7:00
        noonTime: 720, // 12:00
        eveningTime: 1110, // 18:30
        bedtimeTime: 1320, // 22:00
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return groupId;
    });

    const result = await t.query(
      internal.notifications.queries.getGroupNotificationSettings,
      { groupId },
    );

    expect(result.morningTime).toBe(420);
    expect(result.noonTime).toBe(720);
    expect(result.eveningTime).toBe(1110);
    expect(result.bedtimeTime).toBe(1320);
  });

  it("設定がない場合はデフォルト値を返す", async () => {
    const t = convexTest(schema, modules);

    const groupId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      return await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });
    });

    const result = await t.query(
      internal.notifications.queries.getGroupNotificationSettings,
      { groupId },
    );

    expect(result.morningTime).toBe(480); // 8:00
    expect(result.noonTime).toBe(720); // 12:00
    expect(result.eveningTime).toBe(1080); // 18:00
    expect(result.bedtimeTime).toBe(1260); // 21:00
  });
});

describe("getAllGroupsWithNotificationSettings - 全グループ通知設定取得", () => {
  it("アクティブなグループの通知設定を取得できる", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      // グループ1: カスタム設定あり
      const groupId1 = await ctx.db.insert("groups", {
        name: "グループ1",
        createdBy: userId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("groupNotificationSettings", {
        groupId: groupId1,
        morningTime: 420,
        noonTime: 720,
        eveningTime: 1110,
        bedtimeTime: 1320,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // グループ2: 設定なし（デフォルト値を使用）
      await ctx.db.insert("groups", {
        name: "グループ2",
        createdBy: userId,
        createdAt: Date.now(),
      });
    });

    const result = await t.query(
      internal.notifications.queries.getAllGroupsWithNotificationSettings,
      {},
    );

    expect(result).toHaveLength(2);

    // グループ1: カスタム設定
    const group1 = result.find(
      (g: { settings: { morningTime: number } }) =>
        g.settings.morningTime === 420,
    );
    expect(group1).toBeDefined();
    expect(group1?.settings.eveningTime).toBe(1110);

    // グループ2: デフォルト設定
    const group2 = result.find(
      (g: { settings: { morningTime: number } }) =>
        g.settings.morningTime === 480,
    );
    expect(group2).toBeDefined();
    expect(group2?.settings.eveningTime).toBe(1080);
  });

  it("削除されたグループは取得しない", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      // アクティブなグループ
      await ctx.db.insert("groups", {
        name: "アクティブグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });

      // 削除されたグループ
      await ctx.db.insert("groups", {
        name: "削除されたグループ",
        createdBy: userId,
        createdAt: Date.now(),
        deletedAt: Date.now(),
        deletedBy: userId,
      });
    });

    const result = await t.query(
      internal.notifications.queries.getAllGroupsWithNotificationSettings,
      {},
    );

    expect(result).toHaveLength(1);
  });

  it("グループがない場合は空配列を返す", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(
      internal.notifications.queries.getAllGroupsWithNotificationSettings,
      {},
    );

    expect(result).toHaveLength(0);
  });
});
