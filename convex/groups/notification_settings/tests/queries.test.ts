import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";
import { DEFAULT_NOTIFICATION_TIMES } from "../queries";

describe("get - 通知時刻設定取得", () => {
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

      const result = await t.query(
        api.groups.notification_settings.queries.get,
        { groupId },
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
      const result = await asNonMember.query(
        api.groups.notification_settings.queries.get,
        { groupId },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });

    it("脱退済みメンバーはエラーを返す", async () => {
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
          leftAt: Date.now(), // 脱退済み
        });

        return { userId, groupId };
      });

      const asLeftMember = t.withIdentity({ subject: userId });
      const result = await asLeftMember.query(
        api.groups.notification_settings.queries.get,
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
    it("設定がない場合はデフォルト値を返す", async () => {
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
      const result = await asUser.query(
        api.groups.notification_settings.queries.get,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toEqual(DEFAULT_NOTIFICATION_TIMES);
        expect(result.data.morningTime).toBe(480); // 8:00
        expect(result.data.noonTime).toBe(720); // 12:00
        expect(result.data.eveningTime).toBe(1080); // 18:00
        expect(result.data.bedtimeTime).toBe(1260); // 21:00
      }
    });

    it("設定がある場合はその値を返す", async () => {
      const t = convexTest(schema, modules);

      const customSettings = {
        morningTime: 420, // 7:00
        noonTime: 780, // 13:00
        eveningTime: 1110, // 18:30
        bedtimeTime: 1320, // 22:00
      };

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
          ...customSettings,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(
        api.groups.notification_settings.queries.get,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toEqual(customSettings);
      }
    });

    it("patient ロールでも設定を取得できる", async () => {
      const t = convexTest(schema, modules);

      const { patientId, groupId } = await t.run(async (ctx) => {
        const supporterId = await ctx.db.insert("users", {});
        const patientId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: supporterId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: supporterId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { patientId, groupId };
      });

      const asPatient = t.withIdentity({ subject: patientId });
      const result = await asPatient.query(
        api.groups.notification_settings.queries.get,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toEqual(DEFAULT_NOTIFICATION_TIMES);
      }
    });
  });
});
