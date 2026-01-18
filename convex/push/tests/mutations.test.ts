import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("subscribe - プッシュサブスクリプション登録", () => {
  const validSubscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
    keys: {
      p256dh: "test-p256dh-key",
      auth: "test-auth-key",
    },
  };

  describe("認証検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.push.mutations.subscribe, {
        subscription: validSubscription,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("新規登録", () => {
    it("新しいサブスクリプションを登録できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(api.push.mutations.subscribe, {
        subscription: validSubscription,
        userAgent: "Mozilla/5.0 Test Browser",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.isNew).toBe(true);
        expect(result.data.subscriptionId).toBeDefined();

        // DBに保存されていることを確認
        const saved = await t.run(async (ctx) => {
          return await ctx.db.get(result.data.subscriptionId);
        });

        expect(saved).toBeDefined();
        expect(saved?.endpoint).toBe(validSubscription.endpoint);
        expect(saved?.keys.p256dh).toBe(validSubscription.keys.p256dh);
        expect(saved?.keys.auth).toBe(validSubscription.keys.auth);
        expect(saved?.userId).toBe(userId);
        expect(saved?.userAgent).toBe("Mozilla/5.0 Test Browser");
      }
    });

    it("userAgentなしでも登録できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(api.push.mutations.subscribe, {
        subscription: validSubscription,
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.isNew).toBe(true);
      }
    });
  });

  describe("更新", () => {
    it("同じエンドポイントの既存サブスクリプションを更新する", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        // 既存のサブスクリプションを作成
        await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: validSubscription.endpoint,
          keys: {
            p256dh: "old-p256dh-key",
            auth: "old-auth-key",
          },
          userAgent: "Old Browser",
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
        });

        return userId;
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(api.push.mutations.subscribe, {
        subscription: validSubscription,
        userAgent: "New Browser",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.isNew).toBe(false);

        // 更新されていることを確認
        const updated = await t.run(async (ctx) => {
          return await ctx.db.get(result.data.subscriptionId);
        });

        expect(updated?.keys.p256dh).toBe(validSubscription.keys.p256dh);
        expect(updated?.keys.auth).toBe(validSubscription.keys.auth);
        expect(updated?.userAgent).toBe("New Browser");
      }
    });

    it("別のユーザーのエンドポイントでも更新される（デバイス共有ケース）", async () => {
      const t = convexTest(schema, modules);

      const { userId1, userId2 } = await t.run(async (ctx) => {
        const userId1 = await ctx.db.insert("users", {});
        const userId2 = await ctx.db.insert("users", {});

        // ユーザー1が既に登録
        await ctx.db.insert("pushSubscriptions", {
          userId: userId1,
          endpoint: validSubscription.endpoint,
          keys: {
            p256dh: "user1-key",
            auth: "user1-auth",
          },
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
        });

        return { userId1, userId2 };
      });

      // ユーザー2が同じエンドポイントで登録
      const asUser2 = t.withIdentity({ subject: userId2 });
      const result = await asUser2.mutation(api.push.mutations.subscribe, {
        subscription: validSubscription,
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.isNew).toBe(false);

        // ユーザーIDが更新されていることを確認
        const updated = await t.run(async (ctx) => {
          return await ctx.db.get(result.data.subscriptionId);
        });

        expect(updated?.userId).toBe(userId2);
      }
    });
  });
});

describe("unsubscribe - プッシュサブスクリプション削除", () => {
  const testEndpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint-456";

  describe("認証検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.push.mutations.unsubscribe, {
        endpoint: testEndpoint,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("自分のサブスクリプションを削除できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, subscriptionId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const subscriptionId = await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: testEndpoint,
          keys: {
            p256dh: "test-key",
            auth: "test-auth",
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, subscriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(api.push.mutations.unsubscribe, {
        endpoint: testEndpoint,
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(true);
        expect(result.data.message).toBe("サブスクリプションを削除しました");
      }

      // DBから削除されていることを確認
      const deleted = await t.run(async (ctx) => {
        return await ctx.db.get(subscriptionId);
      });
      expect(deleted).toBeNull();
    });

    it("存在しないエンドポイントでも成功扱い", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(api.push.mutations.unsubscribe, {
        endpoint: "https://non-existent-endpoint.com",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(true);
        expect(result.data.message).toBe(
          "サブスクリプションが見つかりませんでした",
        );
      }
    });
  });

  describe("権限検証", () => {
    it("他人のサブスクリプションは削除できない", async () => {
      const t = convexTest(schema, modules);

      const { userId1, userId2 } = await t.run(async (ctx) => {
        const userId1 = await ctx.db.insert("users", {});
        const userId2 = await ctx.db.insert("users", {});

        // ユーザー1のサブスクリプション
        await ctx.db.insert("pushSubscriptions", {
          userId: userId1,
          endpoint: testEndpoint,
          keys: {
            p256dh: "user1-key",
            auth: "user1-auth",
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId1, userId2 };
      });

      // ユーザー2がユーザー1のサブスクリプションを削除しようとする
      const asUser2 = t.withIdentity({ subject: userId2 });
      const result = await asUser2.mutation(api.push.mutations.unsubscribe, {
        endpoint: testEndpoint,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このサブスクリプションを削除する権限がありません",
        );
      }
    });
  });
});

describe("unsubscribeAll - 全サブスクリプション削除", () => {
  describe("認証検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.push.mutations.unsubscribeAll, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("自分の全サブスクリプションを削除できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        // 複数のサブスクリプションを作成
        await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: "https://endpoint1.com",
          keys: { p256dh: "key1", auth: "auth1" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: "https://endpoint2.com",
          keys: { p256dh: "key2", auth: "auth2" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: "https://endpoint3.com",
          keys: { p256dh: "key3", auth: "auth3" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return userId;
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.push.mutations.unsubscribeAll,
        {},
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(true);
        expect(result.data.count).toBe(3);
      }

      // 全て削除されていることを確認
      const remaining = await t.run(async (ctx) => {
        return await ctx.db
          .query("pushSubscriptions")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect();
      });
      expect(remaining).toHaveLength(0);
    });

    it("サブスクリプションがない場合も成功", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.push.mutations.unsubscribeAll,
        {},
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.success).toBe(true);
        expect(result.data.count).toBe(0);
      }
    });

    it("他のユーザーのサブスクリプションは削除しない", async () => {
      const t = convexTest(schema, modules);

      const { userId1, userId2 } = await t.run(async (ctx) => {
        const userId1 = await ctx.db.insert("users", {});
        const userId2 = await ctx.db.insert("users", {});

        // ユーザー1のサブスクリプション
        await ctx.db.insert("pushSubscriptions", {
          userId: userId1,
          endpoint: "https://user1-endpoint.com",
          keys: { p256dh: "key1", auth: "auth1" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // ユーザー2のサブスクリプション
        await ctx.db.insert("pushSubscriptions", {
          userId: userId2,
          endpoint: "https://user2-endpoint.com",
          keys: { p256dh: "key2", auth: "auth2" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId1, userId2 };
      });

      // ユーザー1が全削除
      const asUser1 = t.withIdentity({ subject: userId1 });
      const result = await asUser1.mutation(
        api.push.mutations.unsubscribeAll,
        {},
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.count).toBe(1);
      }

      // ユーザー2のサブスクリプションは残っている
      const user2Subs = await t.run(async (ctx) => {
        return await ctx.db
          .query("pushSubscriptions")
          .withIndex("by_userId", (q) => q.eq("userId", userId2))
          .collect();
      });
      expect(user2Subs).toHaveLength(1);
    });
  });
});
