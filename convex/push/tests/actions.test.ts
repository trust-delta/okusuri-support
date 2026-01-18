import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

/**
 * プッシュ通知actionsのテスト
 *
 * 注意: これらのテストは外部サービス（web-push）を使用するため、
 * 実際の通知送信は行われません。主に認証チェックとロジックの検証に限定しています。
 */

describe("sendTestNotification - テスト通知送信", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.action(api.push.actions.sendTestNotification, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("サブスクリプションなしの場合", () => {
    it("サブスクリプションがない場合は送信失敗を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.action(
        api.push.actions.sendTestNotification,
        {},
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(false);
        expect(result.data.sent).toBe(0);
        expect(result.data.message).toContain("見つかりませんでした");
      }
    });
  });
});

describe("sendToUser - 特定ユーザーへの通知送信", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.action(api.push.actions.sendToUser, {
        userId: "test-user",
        payload: {
          title: "テスト",
          body: "テスト通知",
        },
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("サブスクリプションなしの場合", () => {
    it("サブスクリプションがない場合は送信失敗を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.action(api.push.actions.sendToUser, {
        userId,
        payload: {
          title: "テスト",
          body: "テスト通知",
        },
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(false);
        expect(result.data.sent).toBe(0);
      }
    });
  });
});

describe("sendToGroup - グループへの通知送信", () => {
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

      const result = await t.action(api.push.actions.sendToGroup, {
        groupId,
        payload: {
          title: "テスト",
          body: "テスト通知",
        },
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("メンバーシップ検証", () => {
    it("グループメンバーでない場合はメンバーが見つからないと返す", async () => {
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

      const result = await asUser.action(api.push.actions.sendToGroup, {
        groupId,
        payload: {
          title: "テスト",
          body: "テスト通知",
        },
      });

      // getGroupMembersがnullを返すため、メンバーが見つからない
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(false);
        expect(result.data.sent).toBe(0);
        expect(result.data.message).toContain("見つかりませんでした");
      }
    });
  });

  describe("正常系（サブスクリプションなし）", () => {
    it("メンバーがいてもサブスクリプションがない場合は送信0件", async () => {
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

      const result = await asUser.action(api.push.actions.sendToGroup, {
        groupId,
        payload: {
          title: "テスト",
          body: "テスト通知",
        },
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        // メンバーは見つかるが、サブスクリプションがない
        expect(result.data.memberCount).toBe(1);
        expect(result.data.total).toBe(0);
        expect(result.data.sent).toBe(0);
      }
    });
  });
});
