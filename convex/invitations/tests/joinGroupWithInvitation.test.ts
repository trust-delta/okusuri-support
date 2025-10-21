import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";

describe("joinGroupWithInvitation - グループ参加処理", () => {
  describe("認証確認", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema);

      // グループと招待を作成
      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });
      });

      // 認証なしで参加を試行
      const result = await t.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "supporter",
          displayName: "テストユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("表示名の検証", () => {
    it("表示名が空の場合はエラーを返す", async () => {
      const t = convexTest(schema);

      // ユーザーとグループを作成
      const setup = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {
          displayName: "作成者",
        });

        const newUserId = await ctx.db.insert("users", {
          // displayName なし
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { newUserId };
      });

      const asNewUser = t.withIdentity({ subject: setup.newUserId });

      // 表示名なしで参加を試行
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "supporter",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("表示名を入力してください");
      }
    });

    it("表示名が50文字を超える場合はエラーを返す", async () => {
      const t = convexTest(schema);

      const { newUserId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { newUserId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      // 51文字の表示名で参加を試行
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "supporter",
          displayName: "あ".repeat(51),
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "表示名は50文字以内で入力してください",
        );
      }
    });

    it("既存のdisplayNameがある場合は引数を省略可能", async () => {
      const t = convexTest(schema);

      const { newUserId, groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { newUserId, groupId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      // displayName引数なしで参加
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "supporter",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) return;
      expect(result.data.groupId).toBe(groupId);
    });
  });

  describe("招待コード検証", () => {
    it("存在しない招待コードの場合はエラーを返す", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          displayName: "テストユーザー",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "NOTEXIST",
          role: "supporter",
          displayName: "テストユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("招待コードが無効です");
      }
    });

    it("有効期限切れの招待コードの場合はエラーを返す", async () => {
      const t = convexTest(schema);

      const { newUserId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        // 有効期限切れの招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "EXPIRED",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3日前（期限切れ）
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { newUserId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "EXPIRED",
          role: "supporter",
          displayName: "新規ユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("招待コードが無効です");
      }
    });

    it("使用済みの招待コードの場合はエラーを返す", async () => {
      const t = convexTest(schema);

      const { newUserId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        // 使用済みの招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "USED",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: true,
          usedBy: "otherUser",
          usedAt: Date.now(),
        });

        return { newUserId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "USED",
          role: "supporter",
          displayName: "新規ユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("招待コードが無効です");
      }
    });
  });

  describe("許可ロールの検証", () => {
    it("許可されていないロールで参加しようとするとエラーを返す", async () => {
      const t = convexTest(schema);

      const { newUserId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        // Supporterのみ許可の招待を作成
        await ctx.db.insert("groupInvitations", {
          code: "SUPPORTER_ONLY",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["supporter"], // Supporterのみ
          isUsed: false,
        });

        return { newUserId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      // Patientロールで参加を試行
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "SUPPORTER_ONLY",
          role: "patient",
          displayName: "新規ユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "この招待ではsupporterとして参加できます",
        );
      }
    });
  });

  describe("重複参加防止", () => {
    it("既にグループに参加している場合はエラーを返す", async () => {
      const t = convexTest(schema);

      const { userId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        // 既にメンバーとして参加
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { userId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // 既に参加しているグループに再度参加を試行
      const result = await asUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "supporter",
          displayName: "テストユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("既にこのグループのメンバーです");
      }
    });
  });

  describe("Patient単一性制約", () => {
    it("既にPatientが存在する場合、Patientロールでの参加を拒否", async () => {
      const t = convexTest(schema);

      const { newUserId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const patientId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        // CreatorはSupporter
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 既にPatientが存在
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        // 両ロール許可の招待を作成（実際にはこの状況では作成されないはずだが、テストのため）
        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { newUserId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      // Patientロールで参加を試行
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "patient",
          displayName: "新規ユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループには既に患者が登録されています",
        );
      }
    });

    it("Patient不在の場合、Patientロールでの参加を許可", async () => {
      const t = convexTest(schema);

      const { newUserId, groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        // CreatorはSupporter（Patientなし）
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { newUserId, groupId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      // Patientロールで参加
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "patient",
          displayName: "新規患者",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) return;
      expect(result.data.groupId).toBe(groupId);

      // Patientとして参加できたことを確認
      const membership = await t.run(async (ctx) => {
        return await ctx.db.get(result.data.membershipId);
      });

      expect(membership?.role).toBe("patient");
    });

    it("Supporterロールは常に参加可能", async () => {
      const t = convexTest(schema);

      const { newUserId, groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const patientId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        // CreatorはSupporter
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 既にPatientが存在
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "TEST1234",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["supporter"],
          isUsed: false,
        });

        return { newUserId, groupId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      // Supporterロールで参加
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "TEST1234",
          role: "supporter",
          displayName: "新規サポーター",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) return;
      expect(result.data.groupId).toBe(groupId);
    });
  });

  describe("グループメンバーシップ作成と招待の使用済み更新", () => {
    it("正常にグループに参加できる", async () => {
      const t = convexTest(schema);

      const { newUserId, groupId, invitationId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const newUserId = await ctx.db.insert("users", {
          displayName: "$1",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        const invitationId = await ctx.db.insert("groupInvitations", {
          code: "SUCCESS",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { newUserId, groupId, invitationId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      const beforeJoin = Date.now();
      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "SUCCESS",
          role: "supporter",
          displayName: "新規ユーザー",
        },
      );
      const afterJoin = Date.now();

      // 返却値の検証
      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) return;
      expect(result.data.groupId).toBe(groupId);
      expect(result.data.membershipId).toBeDefined();

      // メンバーシップの検証
      const membership = await t.run(async (ctx) => {
        return await ctx.db.get(result.data.membershipId);
      });

      expect(membership).toBeDefined();
      expect(membership?.groupId).toBe(groupId);
      expect(membership?.userId).toBe(newUserId);
      expect(membership?.role).toBe("supporter");
      expect(membership?.joinedAt).toBeGreaterThanOrEqual(beforeJoin);
      expect(membership?.joinedAt).toBeLessThanOrEqual(afterJoin);

      // 招待の使用済み更新の検証
      const invitation = await t.run(async (ctx) => {
        return await ctx.db.get(invitationId);
      });

      expect(invitation?.isUsed).toBe(true);
      expect(invitation?.usedBy).toBe(newUserId);
      expect(invitation?.usedAt).toBeGreaterThanOrEqual(beforeJoin);
      expect(invitation?.usedAt).toBeLessThanOrEqual(afterJoin);
    });
  });
});
