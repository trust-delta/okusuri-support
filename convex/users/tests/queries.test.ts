import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("getCurrentUser - 現在のユーザー情報取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(api.users.queries.getCurrentUser, {});

      expect(result).toBeNull();
    });
  });

  describe("正常系", () => {
    it("基本的なユーザー情報を取得できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          displayName: "テストユーザー",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/image.png",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.users.queries.getCurrentUser, {});

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.displayName).toBe("テストユーザー");
      expect(result?.name).toBe("Test User");
      expect(result?.email).toBe("test@example.com");
      expect(result?.image).toBe("https://example.com/image.png");
    });

    it("displayName が未設定でも取得できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          name: "Test User",
          email: "test@example.com",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.users.queries.getCurrentUser, {});

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.displayName).toBeUndefined();
      expect(result?.name).toBe("Test User");
      expect(result?.email).toBe("test@example.com");
    });

    it("OAuth 画像 URL を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          image: "https://oauth-provider.com/avatar.png",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.users.queries.getCurrentUser, {});

      expect(result?.image).toBe("https://oauth-provider.com/avatar.png");
    });

    it("カスタム画像がある場合はストレージ URL を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId } = await t.run(async (ctx) => {
        // ストレージにダミーファイルをアップロード
        const storageId = await ctx.storage.store(new Blob(["test image"]));

        const userId = await ctx.db.insert("users", {
          image: "https://oauth-provider.com/avatar.png", // OAuth画像
          customImageStorageId: storageId, // カスタム画像
        });

        return { userId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.users.queries.getCurrentUser, {});

      // カスタム画像が優先される（OAuth画像ではない）
      expect(result?.image).not.toBe("https://oauth-provider.com/avatar.png");
      expect(result?.image).toBeDefined();
    });

    it("画像が設定されていない場合は undefined を返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.users.queries.getCurrentUser, {});

      expect(result?.image).toBeUndefined();
    });

    it("全てのフィールドが未設定でも userId は返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.users.queries.getCurrentUser, {});

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.displayName).toBeUndefined();
      expect(result?.name).toBeUndefined();
      expect(result?.email).toBeUndefined();
      expect(result?.image).toBeUndefined();
    });
  });
});
