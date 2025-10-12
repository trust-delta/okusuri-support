import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";

describe("createInvitationInternal - 招待コード生成ロジック", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema);

      // グループを作成
      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      // 認証なしで招待コード生成を試行（withIdentityなし）
      await expect(
        t.mutation(api.invitations.mutations.createInvitationInternal, {
          groupId,
          code: "TEST1234",
        }),
      ).rejects.toThrow("認証が必要です");
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema);

      // ユーザーを作成
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      // グループを作成（別のユーザーが作成）
      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "他人のグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
      });

      // メンバーでないグループの招待コード生成を試行
      const asNonMember = t.withIdentity({ subject: userId });
      await expect(
        asNonMember.mutation(
          api.invitations.mutations.createInvitationInternal,
          {
            groupId,
            code: "TEST1234",
          },
        ),
      ).rejects.toThrow("このグループのメンバーではありません");
    });
  });

  describe("Patient在籍状況に基づくロール制御", () => {
    it("Patient不在時は両ロール（patient、supporter）を許可", async () => {
      const t = convexTest(schema);

      // ユーザーとグループを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // Supporterとして参加（Patientは不在）
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      // 認証コンテキストを設定（withIdentityを使用）
      const asUser = t.withIdentity({ subject: userId });

      // 招待コードを生成
      const result = await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "TEST1234",
        },
      );

      expect(result.allowedRoles).toEqual(["patient", "supporter"]);
    });

    it("Patient存在時はSupporterのみを許可", async () => {
      const t = convexTest(schema);

      // ユーザーとグループを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const patientUserId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 作成者はSupporterとして参加
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 別ユーザーがPatientとして参加
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientUserId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      // 認証コンテキストを設定（withIdentityを使用）
      const asUser = t.withIdentity({ subject: userId });

      // 招待コードを生成
      const result = await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "TEST5678",
        },
      );

      expect(result.allowedRoles).toEqual(["supporter"]);
    });
  });

  describe("招待コードの一意性確保", () => {
    it("コードが重複している場合はエラーを返す", async () => {
      const t = convexTest(schema);

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

        // 既存の招待コードを挿入
        await ctx.db.insert("groupInvitations", {
          code: "DUPLICATE",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { userId, groupId };
      });

      // 認証コンテキストを設定（withIdentityを使用）
      const asUser = t.withIdentity({ subject: userId });

      // 重複するコードで招待を生成
      await expect(
        asUser.mutation(api.invitations.mutations.createInvitationInternal, {
          groupId,
          code: "DUPLICATE",
        }),
      ).rejects.toThrow("招待コードが重複しています");
    });
  });

  describe("有効期限設定", () => {
    it("有効期限が7日後に設定される", async () => {
      const t = convexTest(schema);

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

      // 認証コンテキストを設定（withIdentityを使用）
      const asUser = t.withIdentity({ subject: userId });

      const beforeCreation = Date.now();
      const result = await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "TEST7DAYS",
        },
      );
      const afterCreation = Date.now();

      // 7日後の期限を計算（前後の誤差を考慮）
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const expectedExpiresAtMin = beforeCreation + sevenDaysInMs;
      const expectedExpiresAtMax = afterCreation + sevenDaysInMs;

      expect(result.expiresAt).toBeGreaterThanOrEqual(expectedExpiresAtMin);
      expect(result.expiresAt).toBeLessThanOrEqual(expectedExpiresAtMax);
    });
  });

  describe("招待レコード作成", () => {
    it("正しい招待レコードが作成される", async () => {
      const t = convexTest(schema);

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

      // 認証コンテキストを設定（withIdentityを使用）
      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "TESTCODE",
        },
      );

      // 返却値の検証
      expect(result.invitationId).toBeDefined();
      expect(result.code).toBe("TESTCODE");
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.allowedRoles).toContain("patient");
      expect(result.allowedRoles).toContain("supporter");
      expect(result.invitationLink).toContain("/invite/TESTCODE");

      // DBレコードの検証
      const invitation = await t.run(async (ctx) => {
        return await ctx.db.get(result.invitationId);
      });

      expect(invitation).toBeDefined();
      expect(invitation?.code).toBe("TESTCODE");
      expect(invitation?.groupId).toBe(groupId);
      expect(invitation?.createdBy).toBe(userId);
      expect(invitation?.isUsed).toBe(false);
      expect(invitation?.usedBy).toBeUndefined();
      expect(invitation?.usedAt).toBeUndefined();
    });
  });
});
