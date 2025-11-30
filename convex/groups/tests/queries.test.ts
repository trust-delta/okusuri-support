import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("getUserGroupStatus - ユーザーのグループ参加状況取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      // 認証なしでクエリを実行
      const result = await t.query(api.groups.queries.getUserGroupStatus, {});

      expect(result).toBeNull();
    });
  });

  describe("グループ参加状況", () => {
    it("グループに参加していない場合は hasGroup: false を返す", async () => {
      const t = convexTest(schema, modules);

      // ユーザーを作成
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      // 認証コンテキストを設定
      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.groups.queries.getUserGroupStatus,
        {},
      );

      expect(result).toEqual({ hasGroup: false, groups: [] });
    });

    it("グループに参加している場合は hasGroup: true とグループ情報を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          activeGroupId: undefined,
        });

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

      const result = await asUser.query(
        api.groups.queries.getUserGroupStatus,
        {},
      );

      expect(result).not.toBeNull();
      expect(result?.hasGroup).toBe(true);
      expect(result?.groups).toHaveLength(1);
      expect(result?.groups[0]?.groupId).toBe(groupId);
      expect(result?.groups[0]?.groupName).toBe("テストグループ");
      expect(result?.groups[0]?.role).toBe("patient");
    });

    it("複数のグループに参加している場合は全てのグループを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        // グループ1を作成
        const groupId1 = await ctx.db.insert("groups", {
          name: "グループ1",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId1,
          userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        // グループ2を作成
        const groupId2 = await ctx.db.insert("groups", {
          name: "グループ2",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId2,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.groups.queries.getUserGroupStatus,
        {},
      );

      expect(result?.hasGroup).toBe(true);
      expect(result?.groups).toHaveLength(2);
    });

    it("脱退済みのグループは含まれない", async () => {
      const t = convexTest(schema, modules);

      const { userId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "脱退済みグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // leftAt が設定されているメンバーシップ（脱退済み）
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
          leftAt: Date.now(),
        });

        return { userId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.groups.queries.getUserGroupStatus,
        {},
      );

      expect(result).toEqual({ hasGroup: false, groups: [] });
    });

    it("削除済みグループは含まれない", async () => {
      const t = convexTest(schema, modules);

      const { userId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "削除済みグループ",
          createdBy: userId,
          createdAt: Date.now(),
          deletedAt: Date.now(), // 削除済み
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(
        api.groups.queries.getUserGroupStatus,
        {},
      );

      expect(result?.hasGroup).toBe(false);
      expect(result?.groups).toHaveLength(0);
    });

    it("activeGroupId を含めて返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "アクティブグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });

        const userId = await ctx.db.insert("users", {
          activeGroupId: groupId,
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

      const result = await asUser.query(
        api.groups.queries.getUserGroupStatus,
        {},
      );

      expect(result?.activeGroupId).toBe(groupId);
    });
  });
});

describe("getGroupMembers - グループメンバー一覧取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      // 認証なしでクエリを実行
      const result = await t.query(api.groups.queries.getGroupMembers, {
        groupId,
      });

      expect(result).toBeNull();
    });
  });

  describe("メンバーシップ検証", () => {
    it("グループメンバーでない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "他人のグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupMembers, {
        groupId,
      });

      expect(result).toBeNull();
    });

    it("脱退済みメンバーがアクセスした場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 脱退済みのメンバーシップ
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
          leftAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupMembers, {
        groupId,
      });

      expect(result).toBeNull();
    });
  });

  describe("グループ状態検証", () => {
    it("削除済みグループの場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "削除済みグループ",
          createdBy: userId,
          createdAt: Date.now(),
          deletedAt: Date.now(),
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

      const result = await asUser.query(api.groups.queries.getGroupMembers, {
        groupId,
      });

      expect(result).toBeNull();
    });
  });

  describe("正常系データ取得", () => {
    it("グループメンバー一覧を取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          displayName: "テストユーザー",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/image.png",
        });

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

      const result = await asUser.query(api.groups.queries.getGroupMembers, {
        groupId,
      });

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result?.[0]?.userId).toBe(userId);
      expect(result?.[0]?.displayName).toBe("テストユーザー");
      expect(result?.[0]?.role).toBe("patient");
      expect(result?.[0]?.name).toBe("Test User");
      expect(result?.[0]?.email).toBe("test@example.com");
      expect(result?.[0]?.image).toBe("https://example.com/image.png");
    });

    it("複数のアクティブメンバーを取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          displayName: "ユーザー1",
        });

        const userId2 = await ctx.db.insert("users", {
          displayName: "ユーザー2",
        });

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

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId2,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupMembers, {
        groupId,
      });

      expect(result).toHaveLength(2);
    });

    it("脱退済みメンバーは含まれない", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          displayName: "アクティブユーザー",
        });

        const leftUserId = await ctx.db.insert("users", {
          displayName: "脱退ユーザー",
        });

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

        // 脱退済みメンバー
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: leftUserId,
          role: "supporter",
          joinedAt: Date.now(),
          leftAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupMembers, {
        groupId,
      });

      expect(result).toHaveLength(1);
      expect(result?.[0]?.displayName).toBe("アクティブユーザー");
    });
  });
});

describe("getGroupDetails - グループ詳細取得", () => {
  describe("認証チェック", () => {
    it("認証されていない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "creator",
          createdAt: Date.now(),
        });
      });

      // 認証なしでクエリを実行
      const result = await t.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result).toBeNull();
    });
  });

  describe("メンバーシップ検証", () => {
    it("グループメンバーでない場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "他人のグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result).toBeNull();
    });

    it("脱退済みメンバーがアクセスした場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 脱退済みのメンバーシップ
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
          leftAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result).toBeNull();
    });
  });

  describe("グループ状態検証", () => {
    it("存在しないグループの場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, fakeGroupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        // 存在するグループを作成して削除し、そのIDを使う
        const fakeGroupId = await ctx.db.insert("groups", {
          name: "削除するグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.delete(fakeGroupId);

        return { userId, fakeGroupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId: fakeGroupId,
      });

      expect(result).toBeNull();
    });

    it("削除済みグループの場合は null を返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "削除済みグループ",
          createdBy: userId,
          createdAt: Date.now(),
          deletedAt: Date.now(),
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

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result).toBeNull();
    });
  });

  describe("正常系データ取得", () => {
    it("グループ詳細を取得できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, createdAt } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const createdAt = Date.now();

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          description: "テスト用のグループです",
          createdBy: userId,
          createdAt,
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId, createdAt };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result).not.toBeNull();
      expect(result?._id).toBe(groupId);
      expect(result?.name).toBe("テストグループ");
      expect(result?.description).toBe("テスト用のグループです");
      expect(result?.createdBy).toBe(userId);
      expect(result?.createdAt).toBe(createdAt);
      expect(result?.myRole).toBe("patient");
      expect(result?.memberCount).toBe(1);
      expect(result?.isLastMember).toBe(true);
    });

    it("メンバー数と最後のメンバーフラグを正しく計算する", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const userId2 = await ctx.db.insert("users", {});

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

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId2,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result?.memberCount).toBe(2);
      expect(result?.isLastMember).toBe(false);
    });

    it("脱退済みメンバーはメンバー数に含まれない", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const leftUserId = await ctx.db.insert("users", {});

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

        // 脱退済みメンバー
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: leftUserId,
          role: "supporter",
          joinedAt: Date.now(),
          leftAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result?.memberCount).toBe(1);
      expect(result?.isLastMember).toBe(true);
    });

    it("supporter ロールでアクセスした場合も詳細を取得できる", async () => {
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

      const result = await asUser.query(api.groups.queries.getGroupDetails, {
        groupId,
      });

      expect(result).not.toBeNull();
      expect(result?.myRole).toBe("supporter");
    });
  });
});
