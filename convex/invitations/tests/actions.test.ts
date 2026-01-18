import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("createInvitation - 招待コード生成アクション", () => {
  describe("認証検証", () => {
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

      const result = await t.action(api.invitations.actions.createInvitation, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("メンバーシップ検証", () => {
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
      const result = await asNonMember.action(
        api.invitations.actions.createInvitation,
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
    it("招待コードを生成できる", async () => {
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
      const result = await asUser.action(
        api.invitations.actions.createInvitation,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.invitationId).toBeDefined();
        expect(result.data.code).toHaveLength(8);
        expect(result.data.code).toMatch(/^[a-zA-Z0-9]+$/);
        expect(result.data.expiresAt).toBeGreaterThan(Date.now());
        expect(result.data.allowedRoles).toContain("patient");
        expect(result.data.allowedRoles).toContain("supporter");
        expect(result.data.invitationLink).toContain(
          `/invite/${result.data.code}`,
        );
      }
    });

    it("Patient存在時はsupporterのみ許可される", async () => {
      const t = convexTest(schema, modules);

      const { supporterId, groupId } = await t.run(async (ctx) => {
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

        return { supporterId, groupId };
      });

      const asSupporter = t.withIdentity({ subject: supporterId });
      const result = await asSupporter.action(
        api.invitations.actions.createInvitation,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.allowedRoles).toEqual(["supporter"]);
      }
    });

    it("招待レコードがDBに保存される", async () => {
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
      const result = await asUser.action(
        api.invitations.actions.createInvitation,
        { groupId },
      );

      expect(result.isSuccess).toBe(true);

      if (result.isSuccess) {
        // DBを確認
        const invitation = await t.run(async (ctx) => {
          return await ctx.db.get(result.data.invitationId);
        });

        expect(invitation).not.toBeNull();
        expect(invitation?.code).toBe(result.data.code);
        expect(invitation?.groupId).toBe(groupId);
        expect(invitation?.isUsed).toBe(false);
      }
    });

    it("有効期限が7日後に設定される", async () => {
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

      const beforeCreation = Date.now();
      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.action(
        api.invitations.actions.createInvitation,
        { groupId },
      );
      const afterCreation = Date.now();

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        const expectedMin = beforeCreation + sevenDaysInMs;
        const expectedMax = afterCreation + sevenDaysInMs;

        expect(result.data.expiresAt).toBeGreaterThanOrEqual(expectedMin);
        expect(result.data.expiresAt).toBeLessThanOrEqual(expectedMax);
      }
    });
  });

  describe("複数回の招待コード生成", () => {
    it("同じグループで複数の招待コードを生成できる", async () => {
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

      // 2つの招待コードを生成
      const result1 = await asUser.action(
        api.invitations.actions.createInvitation,
        { groupId },
      );
      const result2 = await asUser.action(
        api.invitations.actions.createInvitation,
        { groupId },
      );

      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);

      if (result1.isSuccess && result2.isSuccess) {
        // コードが異なることを確認
        expect(result1.data.code).not.toBe(result2.data.code);
      }
    });
  });
});
