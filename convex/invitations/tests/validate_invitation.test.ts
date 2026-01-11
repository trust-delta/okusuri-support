import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("validateInvitationCode - 招待コード検証ロジック", () => {
  describe("招待コードの存在確認", () => {
    it("存在しないコードの場合はinvalidを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "NOTEXIST",
        },
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("招待コードが無効です");
      }
    });

    it("有効な招待コードの場合はvalidを返す", async () => {
      const t = convexTest(schema, modules);

      // テストデータの準備
      const { groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          description: "テストグループの説明",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 有効な招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "VALIDCODE",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7日後
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { groupId };
      });

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "VALIDCODE",
        },
      );

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.invitation.groupId).toBe(groupId);
        expect(result.invitation.groupName).toBe("テストグループ");
        expect(result.invitation.groupDescription).toBe("テストグループの説明");
        expect(result.invitation.memberCount).toBe(1);
        expect(result.invitation.allowedRoles).toEqual([
          "patient",
          "supporter",
        ]);
      }
    });
  });

  describe("有効期限チェック", () => {
    it("有効期限切れのコードはinvalidを返す", async () => {
      const t = convexTest(schema, modules);

      // 有効期限切れの招待を作成
      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 過去の有効期限を設定
        await ctx.db.insert("groupInvitations", {
          code: "EXPIRED",
          groupId,
          createdBy: userId,
          createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10日前
          expiresAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3日前（期限切れ）
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });
      });

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "EXPIRED",
        },
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("招待コードが無効です");
      }
    });

    it("有効期限内のコードはvalidを返す", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 有効期限内の招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "NOTEXPIRED",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5日後
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });
      });

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "NOTEXPIRED",
        },
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("使用済みチェック", () => {
    it("使用済みのコードはinvalidを返す", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 使用済みの招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "USED",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: true, // 使用済み
          usedBy: "otherUser",
          usedAt: Date.now(),
        });
      });

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "USED",
        },
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("招待コードが無効です");
      }
    });

    it("未使用のコードはvalidを返す", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 未使用の招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "NOTUSED",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });
      });

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "NOTUSED",
        },
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("グループ情報の取得", () => {
    it("グループが存在しない場合はinvalidを返す", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        // 実際に存在するグループを作成してから削除する
        const groupId = await ctx.db.insert("groups", {
          name: "削除予定グループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "NOGROUP",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        // グループを削除
        await ctx.db.delete(groupId);
      });

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "NOGROUP",
        },
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("招待コードが無効です");
      }
    });

    it("グループの詳細情報を返す", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId1 = await ctx.db.insert("users", {});

        const userId2 = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "詳細グループ",
          description: "詳細な説明",
          createdBy: userId1,
          createdAt: Date.now(),
        });

        // 2人のメンバーを追加
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId1,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId2,
          role: "patient",
          joinedAt: Date.now(),
        });

        // 招待を作成（Patient存在のためSupporterのみ許可）
        await ctx.db.insert("groupInvitations", {
          code: "DETAILS",
          groupId,
          createdBy: userId1,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["supporter"],
          isUsed: false,
        });
      });

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "DETAILS",
        },
      );

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.invitation.groupName).toBe("詳細グループ");
        expect(result.invitation.groupDescription).toBe("詳細な説明");
        expect(result.invitation.memberCount).toBe(2);
        expect(result.invitation.allowedRoles).toEqual(["supporter"]);
      }
    });
  });

  describe("エッジケース", () => {
    it("空文字列のコードはinvalidを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "",
        },
      );

      expect(result.valid).toBe(false);
    });

    it("非常に長いコードはinvalidを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "A".repeat(1000),
        },
      );

      expect(result.valid).toBe(false);
    });

    it("大文字小文字が異なるコードは別のコードとして扱う", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 小文字のコードで招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "lowercase",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });
      });

      // 大文字で検証
      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "LOWERCASE",
        },
      );

      expect(result.valid).toBe(false);
    });
  });
});
