import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";

describe("招待機能 - 統合テスト", () => {
  describe("招待コード生成から参加までのエンドツーエンドフロー", () => {
    it("グループメンバーAが招待コードを生成し、ユーザーBが参加できる", async () => {
      const t = convexTest(schema);

      // === セットアップ: グループとメンバーAを作成 ===
      const { creatorId, groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {
          displayName: "メンバーA",
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          description: "統合テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { creatorId, groupId };
      });

      const asCreator = t.withIdentity({ subject: creatorId });

      // === ステップ1: メンバーAが招待コードを生成 ===
      const invitation = await asCreator.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "INTEGRATION",
        },
      );

      expect(invitation.invitationId).toBeDefined();
      expect(invitation.code).toBe("INTEGRATION");
      expect(invitation.allowedRoles).toEqual(["patient", "supporter"]);
      expect(invitation.invitationLink).toContain("/invite/INTEGRATION");

      // === ステップ2: ユーザーBが招待コードを検証 ===
      const validation = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "INTEGRATION",
        },
      );

      expect(validation.valid).toBe(true);
      if (validation.valid) {
        expect(validation.invitation.groupId).toBe(groupId);
        expect(validation.invitation.groupName).toBe("テストグループ");
        expect(validation.invitation.memberCount).toBe(1);
      }

      // === ステップ3: ユーザーBがグループに参加 ===
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          displayName: "ユーザーB",
        });
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      const joinResult = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "INTEGRATION",
          role: "patient",
          displayName: "ユーザーB",
        },
      );

      expect(joinResult.success).toBe(true);
      expect(joinResult.groupId).toBe(groupId);

      // === ステップ4: グループメンバー一覧にユーザーBが追加されたことを確認 ===
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .collect();
      });

      expect(members).toHaveLength(2);
      expect(members.map((m) => m.userId)).toContain(creatorId);
      expect(members.map((m) => m.userId)).toContain(newUserId);

      const newUserMembership = members.find((m) => m.userId === newUserId);
      expect(newUserMembership?.role).toBe("patient");

      // === ステップ5: 招待が使用済みとしてマークされたことを確認 ===
      const usedInvitation = await t.run(async (ctx) => {
        return await ctx.db.get(invitation.invitationId);
      });

      expect(usedInvitation?.isUsed).toBe(true);
      expect(usedInvitation?.usedBy).toBe(newUserId);
      expect(usedInvitation?.usedAt).toBeDefined();
    });

    it("招待一覧にリアルタイムで新しい招待が表示される", async () => {
      const t = convexTest(schema);

      // グループとメンバーを作成
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

      // 最初は招待が0件
      let invitations = await asUser.query(
        api.invitations.queries.listGroupInvitations,
        {
          groupId,
        },
      );

      expect(invitations).toHaveLength(0);

      // 招待を1件作成
      await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "FIRST",
        },
      );

      invitations = await asUser.query(
        api.invitations.queries.listGroupInvitations,
        {
          groupId,
        },
      );

      expect(invitations).toHaveLength(1);
      expect(invitations[0].code).toBe("FIRST");

      // 招待を2件目作成
      await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "SECOND",
        },
      );

      invitations = await asUser.query(
        api.invitations.queries.listGroupInvitations,
        {
          groupId,
        },
      );

      expect(invitations).toHaveLength(2);
      expect(invitations.map((i) => i.code)).toContain("FIRST");
      expect(invitations.map((i) => i.code)).toContain("SECOND");
    });
  });

  describe("Patient制約の統合テスト", () => {
    it("Patient存在グループでの招待生成はSupporterのみ許可する", async () => {
      const t = convexTest(schema);

      // Patient存在グループを作成
      const { supporterId, groupId } = await t.run(async (ctx) => {
        const supporterId = await ctx.db.insert("users", {});
        const patientId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "Patient存在グループ",
          createdBy: supporterId,
          createdAt: Date.now(),
        });

        // SupporterとPatient両方を追加
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

      // 招待を生成
      const invitation = await asSupporter.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "SUPPORTER_ONLY",
        },
      );

      // 許可ロールがSupporterのみ
      expect(invitation.allowedRoles).toEqual(["supporter"]);

      // 招待コードを検証
      const validation = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "SUPPORTER_ONLY",
        },
      );

      expect(validation.valid).toBe(true);
      if (validation.valid) {
        expect(validation.invitation.allowedRoles).toEqual(["supporter"]);
      }
    });

    it("Patientロール選択時に既存Patientがいる場合はエラーを返す", async () => {
      const t = convexTest(schema);

      // Patient存在グループと招待を作成
      const { groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const patientId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "Patient存在グループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        // 招待を作成（テストのため両ロール許可）
        await ctx.db.insert("groupInvitations", {
          code: "BOTH_ROLES",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { groupId };
      });

      // 新規ユーザーがPatientロールで参加を試行
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          displayName: "新規ユーザー",
        });
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      await expect(
        asNewUser.mutation(api.groups.mutations.joinGroupWithInvitation, {
          invitationCode: "BOTH_ROLES",
          role: "patient",
          displayName: "新規ユーザー",
        }),
      ).rejects.toThrow("このグループには既に患者が登録されています");
    });

    it("Supporterロール選択時は既存Patientの有無に関わらず参加できる", async () => {
      const t = convexTest(schema);

      // Patient存在グループと招待を作成
      const { groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const patientId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "Patient存在グループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientId,
          role: "patient",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          code: "SUPPORTER",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["supporter"],
          isUsed: false,
        });

        return { groupId };
      });

      // 新規ユーザーがSupporterロールで参加
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          displayName: "新規サポーター",
        });
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      const result = await asNewUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "SUPPORTER",
          role: "supporter",
          displayName: "新規サポーター",
        },
      );

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(groupId);

      // グループメンバーが3人（作成者、patient、新規supporter）になったことを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .collect();
      });

      expect(members).toHaveLength(3);
      expect(members.filter((m) => m.role === "patient")).toHaveLength(1);
      expect(members.filter((m) => m.role === "supporter")).toHaveLength(2);
    });
  });

  describe("有効期限切れ招待の処理テスト", () => {
    it("有効期限切れの招待コードでは参加できない", async () => {
      const t = convexTest(schema);

      // 有効期限切れの招待を作成
      await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        // 有効期限が3日前の招待
        await ctx.db.insert("groupInvitations", {
          code: "EXPIRED",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3日前
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });
      });

      // 検証時にinvalidが返される
      const validation = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "EXPIRED",
        },
      );

      expect(validation.valid).toBe(false);
      if (!validation.valid) {
        expect(validation.error).toBe("招待コードが無効です");
      }

      // 参加試行もエラーになる
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          displayName: "テストユーザー",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await expect(
        asUser.mutation(api.groups.mutations.joinGroupWithInvitation, {
          invitationCode: "EXPIRED",
          role: "supporter",
          displayName: "テストユーザー",
        }),
      ).rejects.toThrow("招待コードが無効です");
    });

    it("有効期限内の招待コードは正常に機能する", async () => {
      const t = convexTest(schema);

      // 有効期限内の招待を作成
      const { groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

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

        // 有効期限が5日後の招待
        await ctx.db.insert("groupInvitations", {
          code: "VALID",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5日後
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { groupId };
      });

      // 検証が成功する
      const validation = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "VALID",
        },
      );

      expect(validation.valid).toBe(true);

      // 参加も成功する
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          displayName: "テストユーザー",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "VALID",
          role: "supporter",
          displayName: "テストユーザー",
        },
      );

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(groupId);
    });
  });

  describe("並行招待使用の競合処理テスト", () => {
    it("同一招待コードを2人が同時に使用した場合、1人目のみ成功する", async () => {
      const t = convexTest(schema);

      // グループと招待を作成
      const { groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

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
          code: "CONCURRENT",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { groupId };
      });

      // 2人のユーザーを作成
      const { user1Id, user2Id } = await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert("users", {
          displayName: "ユーザー1",
        });

        const user2Id = await ctx.db.insert("users", {
          displayName: "ユーザー2",
        });

        return { user1Id, user2Id };
      });

      const asUser1 = t.withIdentity({ subject: user1Id });
      const asUser2 = t.withIdentity({ subject: user2Id });

      // 1人目が参加
      const result1 = await asUser1.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "CONCURRENT",
          role: "supporter",
          displayName: "ユーザー1",
        },
      );

      expect(result1.success).toBe(true);

      // 2人目が参加を試行（使用済みエラー）
      await expect(
        asUser2.mutation(api.groups.mutations.joinGroupWithInvitation, {
          invitationCode: "CONCURRENT",
          role: "supporter",
          displayName: "ユーザー2",
        }),
      ).rejects.toThrow("招待コードが無効です");

      // グループメンバーが2人（作成者とユーザー1）のみであることを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .collect();
      });

      expect(members).toHaveLength(2);
      expect(members.map((m) => m.userId)).toContain(user1Id);
      expect(members.map((m) => m.userId)).not.toContain(user2Id);
    });

    it("異なる招待コードを使用した並行参加は両方成功する", async () => {
      const t = convexTest(schema);

      // グループと2つの招待を作成
      const { groupId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});

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

        // 2つの異なる招待コード
        await ctx.db.insert("groupInvitations", {
          code: "CODE1",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        await ctx.db.insert("groupInvitations", {
          code: "CODE2",
          groupId,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          allowedRoles: ["patient", "supporter"],
          isUsed: false,
        });

        return { groupId };
      });

      // 2人のユーザーを作成
      const { user1Id, user2Id } = await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert("users", {
          displayName: "ユーザー1",
        });

        const user2Id = await ctx.db.insert("users", {
          displayName: "ユーザー2",
        });

        return { user1Id, user2Id };
      });

      const asUser1 = t.withIdentity({ subject: user1Id });
      const asUser2 = t.withIdentity({ subject: user2Id });

      // 両方が異なるコードで参加
      const result1 = await asUser1.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "CODE1",
          role: "supporter",
          displayName: "ユーザー1",
        },
      );

      const result2 = await asUser2.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "CODE2",
          role: "supporter",
          displayName: "ユーザー2",
        },
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // グループメンバーが3人（作成者、ユーザー1、ユーザー2）であることを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .collect();
      });

      expect(members).toHaveLength(3);
      expect(members.map((m) => m.userId)).toContain(user1Id);
      expect(members.map((m) => m.userId)).toContain(user2Id);
    });
  });
});
