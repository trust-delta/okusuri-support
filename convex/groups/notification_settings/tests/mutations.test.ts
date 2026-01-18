import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";
import { DEFAULT_NOTIFICATION_TIMES } from "../queries";

describe("update - 通知時刻設定更新", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.groups.notification_settings.mutations.update,
        { groupId, morningTime: 420 },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { otherUserId, groupId } = await t.run(async (ctx) => {
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

        return { otherUserId, groupId };
      });

      const asNonMember = t.withIdentity({ subject: otherUserId });
      const result = await asNonMember.mutation(
        api.groups.notification_settings.mutations.update,
        { groupId, morningTime: 420 },
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
    it("朝の時刻が負の場合はエラーを返す", async () => {
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
        api.groups.notification_settings.mutations.update,
        { groupId, morningTime: -1 },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("朝の時刻が無効です（0〜1439分）");
      }
    });

    it("昼の時刻が1440以上の場合はエラーを返す", async () => {
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
        api.groups.notification_settings.mutations.update,
        { groupId, noonTime: 1440 },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("昼の時刻が無効です（0〜1439分）");
      }
    });

    it("夕方の時刻が小数の場合はエラーを返す", async () => {
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
        api.groups.notification_settings.mutations.update,
        { groupId, eveningTime: 1080.5 },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("夕方の時刻が無効です（0〜1439分）");
      }
    });

    it("就寝前の時刻が無効な場合はエラーを返す", async () => {
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
        api.groups.notification_settings.mutations.update,
        { groupId, bedtimeTime: 2000 },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("就寝前の時刻が無効です（0〜1439分）");
      }
    });
  });

  describe("正常系", () => {
    it("設定がない場合は新規作成される", async () => {
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
        api.groups.notification_settings.mutations.update,
        { groupId, morningTime: 420 },
      );

      expect(result.isSuccess).toBe(true);

      // DBを確認
      const settings = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupNotificationSettings")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .first();
      });

      expect(settings).not.toBeNull();
      expect(settings?.morningTime).toBe(420);
      // 指定していない値はデフォルト
      expect(settings?.noonTime).toBe(DEFAULT_NOTIFICATION_TIMES.noonTime);
      expect(settings?.eveningTime).toBe(
        DEFAULT_NOTIFICATION_TIMES.eveningTime,
      );
      expect(settings?.bedtimeTime).toBe(
        DEFAULT_NOTIFICATION_TIMES.bedtimeTime,
      );
    });

    it("既存設定を部分更新できる", async () => {
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

        await ctx.db.insert("groupNotificationSettings", {
          groupId,
          morningTime: 480,
          noonTime: 720,
          eveningTime: 1080,
          bedtimeTime: 1260,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.groups.notification_settings.mutations.update,
        { groupId, eveningTime: 1110 },
      );

      expect(result.isSuccess).toBe(true);

      // DBを確認
      const settings = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupNotificationSettings")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .first();
      });

      expect(settings?.morningTime).toBe(480); // 変更なし
      expect(settings?.noonTime).toBe(720); // 変更なし
      expect(settings?.eveningTime).toBe(1110); // 更新された
      expect(settings?.bedtimeTime).toBe(1260); // 変更なし
    });

    it("複数の時刻を同時に更新できる", async () => {
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
        api.groups.notification_settings.mutations.update,
        {
          groupId,
          morningTime: 420,
          noonTime: 780,
          eveningTime: 1110,
          bedtimeTime: 1320,
        },
      );

      expect(result.isSuccess).toBe(true);

      // DBを確認
      const settings = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupNotificationSettings")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .first();
      });

      expect(settings?.morningTime).toBe(420);
      expect(settings?.noonTime).toBe(780);
      expect(settings?.eveningTime).toBe(1110);
      expect(settings?.bedtimeTime).toBe(1320);
    });

    it("境界値（0分=深夜0:00）で更新できる", async () => {
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
        api.groups.notification_settings.mutations.update,
        { groupId, bedtimeTime: 0 },
      );

      expect(result.isSuccess).toBe(true);
    });

    it("境界値（1439分=23:59）で更新できる", async () => {
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
        api.groups.notification_settings.mutations.update,
        { groupId, morningTime: 1439 },
      );

      expect(result.isSuccess).toBe(true);
    });
  });
});

describe("createDefault - デフォルト設定作成（内部用）", () => {
  it("デフォルト値で通知設定を作成する", async () => {
    const t = convexTest(schema, modules);

    const groupId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});

      return await ctx.db.insert("groups", {
        name: "テストグループ",
        createdBy: userId,
        createdAt: Date.now(),
      });
    });

    const settingsId = await t.mutation(
      internal.groups.notification_settings.mutations.createDefault,
      { groupId },
    );

    expect(settingsId).toBeDefined();

    // DBを確認
    const settings = await t.run(async (ctx) => {
      return await ctx.db.get(settingsId);
    });

    expect(settings?.morningTime).toBe(DEFAULT_NOTIFICATION_TIMES.morningTime);
    expect(settings?.noonTime).toBe(DEFAULT_NOTIFICATION_TIMES.noonTime);
    expect(settings?.eveningTime).toBe(DEFAULT_NOTIFICATION_TIMES.eveningTime);
    expect(settings?.bedtimeTime).toBe(DEFAULT_NOTIFICATION_TIMES.bedtimeTime);
    expect(settings?.createdAt).toBeDefined();
    expect(settings?.updatedAt).toBeDefined();
  });
});
