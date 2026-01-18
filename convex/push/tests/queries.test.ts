import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../../schema";
import { modules } from "../../test.setup";

// Convex型インスタンス化の深度制限を回避 - 動的インポート
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { api, internal } = require("../../_generated/api");

describe("list - サブスクリプション一覧取得", () => {
  describe("認証検証", () => {
    it("認証されていない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(api.push.queries.list, {});

      expect(result).toEqual([]);
    });
  });

  describe("正常系", () => {
    it("自分のサブスクリプション一覧を取得できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: "https://endpoint1.com",
          keys: { p256dh: "key1", auth: "auth1" },
          userAgent: "Chrome",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: "https://endpoint2.com",
          keys: { p256dh: "key2", auth: "auth2" },
          userAgent: "Firefox",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return userId;
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(api.push.queries.list, {});

      expect(result).toHaveLength(2);
      expect(result.map((s: { endpoint: string }) => s.endpoint)).toContain(
        "https://endpoint1.com",
      );
      expect(result.map((s: { endpoint: string }) => s.endpoint)).toContain(
        "https://endpoint2.com",
      );
    });

    it("サブスクリプションがない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(api.push.queries.list, {});

      expect(result).toEqual([]);
    });

    it("他のユーザーのサブスクリプションは取得しない", async () => {
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

      // ユーザー1として取得
      const asUser1 = t.withIdentity({ subject: userId1 });
      const result = await asUser1.query(api.push.queries.list, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.endpoint).toBe("https://user1-endpoint.com");
    });
  });
});

describe("getByEndpoint - エンドポイントでサブスクリプション取得", () => {
  describe("認証検証", () => {
    it("認証されていない場合はnullを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(api.push.queries.getByEndpoint, {
        endpoint: "https://test-endpoint.com",
      });

      expect(result).toBeNull();
    });
  });

  describe("正常系", () => {
    it("自分のサブスクリプションを取得できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        await ctx.db.insert("pushSubscriptions", {
          userId,
          endpoint: "https://my-endpoint.com",
          keys: { p256dh: "my-key", auth: "my-auth" },
          userAgent: "TestBrowser",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return userId;
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(api.push.queries.getByEndpoint, {
        endpoint: "https://my-endpoint.com",
      });

      expect(result).not.toBeNull();
      expect(result?.endpoint).toBe("https://my-endpoint.com");
      expect(result?.keys.p256dh).toBe("my-key");
      expect(result?.userAgent).toBe("TestBrowser");
    });

    it("存在しないエンドポイントはnullを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.query(api.push.queries.getByEndpoint, {
        endpoint: "https://non-existent.com",
      });

      expect(result).toBeNull();
    });

    it("他のユーザーのサブスクリプションはnullを返す", async () => {
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

        return { userId1, userId2 };
      });

      // ユーザー2がユーザー1のエンドポイントを取得しようとする
      const asUser2 = t.withIdentity({ subject: userId2 });
      const result = await asUser2.query(api.push.queries.getByEndpoint, {
        endpoint: "https://user1-endpoint.com",
      });

      expect(result).toBeNull();
    });
  });
});

describe("listByUserId - ユーザーIDでサブスクリプション取得（内部用）", () => {
  it("指定ユーザーのサブスクリプション一覧を取得できる", async () => {
    const t = convexTest(schema, modules);

    const { userId1, userId2 } = await t.run(async (ctx) => {
      const userId1 = await ctx.db.insert("users", {});
      const userId2 = await ctx.db.insert("users", {});

      // ユーザー1のサブスクリプション（複数）
      await ctx.db.insert("pushSubscriptions", {
        userId: userId1,
        endpoint: "https://user1-endpoint1.com",
        keys: { p256dh: "key1a", auth: "auth1a" },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("pushSubscriptions", {
        userId: userId1,
        endpoint: "https://user1-endpoint2.com",
        keys: { p256dh: "key1b", auth: "auth1b" },
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

    // ユーザー1のサブスクリプションを取得
    const result1 = await t.query(internal.push.queries.listByUserId, {
      userId: userId1,
    });

    expect(result1).toHaveLength(2);
    expect(result1.map((s: { endpoint: string }) => s.endpoint)).toContain(
      "https://user1-endpoint1.com",
    );
    expect(result1.map((s: { endpoint: string }) => s.endpoint)).toContain(
      "https://user1-endpoint2.com",
    );

    // ユーザー2のサブスクリプションを取得
    const result2 = await t.query(internal.push.queries.listByUserId, {
      userId: userId2,
    });

    expect(result2).toHaveLength(1);
    expect(result2[0]?.endpoint).toBe("https://user2-endpoint.com");
  });

  it("サブスクリプションがないユーザーは空配列を返す", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {});
    });

    const result = await t.query(internal.push.queries.listByUserId, {
      userId,
    });

    expect(result).toEqual([]);
  });
});
