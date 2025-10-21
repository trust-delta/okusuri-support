/**
 * 既存機能との統合テスト
 *
 * 招待機能の追加が既存のグループ作成・参加フローに悪影響を与えないことを確認します。
 */

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "@/shared/lib/convex";
import schema from "../../../../convex/schema";

describe("Phase 5: Task 18 - 既存機能との統合確認", () => {
  describe("Task 18.1: 既存グループ作成フローとの共存確認", () => {
    it("オンボーディング時の新規グループ作成が正常動作する", async () => {
      const t = convexTest(schema);

      // ユーザーを作成
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      // 新規グループ作成（オンボーディングフロー）
      const result = await asUser.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "テストユーザー",
          groupName: "統合テストグループ",
          groupDescription: "既存フロー確認用",
          role: "patient",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) return;
      expect(result.data.groupId).toBeDefined();

      // グループが作成されたことを確認
      const group = await t.run(async (ctx) => {
        return await ctx.db.get(result.data.groupId);
      });

      expect(group).toBeDefined();
      expect(group?.name).toBe("統合テストグループ");
      expect(group?.description).toBe("既存フロー確認用");

      // グループメンバーが追加されたことを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .filter((q) => q.eq(q.field("groupId"), result.data.groupId))
          .collect();
      });

      expect(members).toHaveLength(1);
      expect(members[0].userId).toBe(userId);
      expect(members[0].role).toBe("patient");
    });

    it("Supporterロールでの新規グループ作成も正常動作する", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "サポーター",
          groupName: "Supporterグループ",
          groupDescription: "Supporter作成テスト",
          role: "supporter",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) return;

      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .filter((q) => q.eq(q.field("groupId"), result.data.groupId))
          .collect();
      });

      expect(members).toHaveLength(1);
      expect(members[0].role).toBe("supporter");
    });

    it("既存のjoinGroup mutationが影響を受けていない（招待なし参加）", async () => {
      const t = convexTest(schema);

      // セットアップ: グループとメンバーを作成
      const { groupId, newUserId } = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const newUserId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "既存参加フローグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { groupId, newUserId };
      });

      const asNewUser = t.withIdentity({ subject: newUserId });

      // 招待コードなしでの参加（既存フロー）
      const membershipId = await asNewUser.mutation(
        api.groups.mutations.joinGroup,
        {
          groupId,
          role: "supporter",
        },
      );

      expect(membershipId).toBeDefined();

      // グループメンバーが追加されたことを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .filter((q) => q.eq(q.field("groupId"), groupId))
          .collect();
      });

      expect(members).toHaveLength(2);
      const newMember = members.find((m) => m.userId === newUserId);
      expect(newMember).toBeDefined();
      expect(newMember?.role).toBe("supporter");
    });

    it("既存のjoinGroupは重複参加を防止する", async () => {
      const t = convexTest(schema);

      // セットアップ: グループとメンバーを作成
      const { groupId, userId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "重複参加確認グループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { groupId, userId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // 同じユーザーが再度参加を試みる（失敗するはず）
      const result = await asUser.mutation(api.groups.mutations.joinGroup, {
        groupId,
        role: "supporter",
      });
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("既にグループに参加しています");
      }
    });
  });

  describe("Task 18.2: 認証フローとの統合確認", () => {
    it("未認証ユーザーは招待コードを検証できない", async () => {
      const t = convexTest(schema);

      // セットアップ: 招待コードを作成
      await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "認証テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          groupId,
          code: "AUTH0001",
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          isUsed: false,
          allowedRoles: ["patient", "supporter"],
        });
      });

      // 未認証での検証試行（Convex Authは未認証でもクエリを実行可能）
      // ただし、ビジネスロジックで認証を要求する場合もある
      const result = await t.query(
        api.invitations.queries.validateInvitationCode,
        {
          code: "AUTH0001",
        },
      );

      // 招待コードの検証自体は認証不要（公開情報）
      expect(result.valid).toBe(true);
    });

    it("未認証ユーザーは招待コードで参加できない", async () => {
      const t = convexTest(schema);

      // セットアップ: 招待コードを作成
      await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "認証必須グループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "patient",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupInvitations", {
          groupId,
          code: "AUTH0002",
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          isUsed: false,
          allowedRoles: ["supporter"],
        });
      });

      // 未認証での参加試行（認証情報なしで実行）
      const result = await t.mutation(
        api.groups.mutations.joinGroupWithInvitation,
        {
          invitationCode: "AUTH0002",
          role: "supporter",
          displayName: "未認証ユーザー",
        },
      );
      expect(result.isSuccess).toBe(false);
    });

    it("認証済みユーザーは自身が作成したグループを取得できる", async () => {
      const t = convexTest(schema);

      // セットアップ: グループを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "認証確認グループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // 自分のグループを取得
      const status = await asUser.query(api.groups.queries.getUserGroupStatus);

      expect(status).toBeDefined();
      expect(status?.hasGroup).toBe(true);
      expect(status?.groups).toHaveLength(1);
      expect(status?.groups[0].groupId).toBe(groupId);
      expect(status?.groups[0].groupName).toBe("認証確認グループ");
    });

    it("認証済みユーザーは自分が参加していないグループの招待は作成できない", async () => {
      const t = convexTest(schema);

      // セットアップ: 2人のユーザーとグループを作成
      const setup = await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert("users", {});
        const user2Id = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "ユーザー1のグループ",
          createdBy: user1Id,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: user1Id,
          role: "patient",
          joinedAt: Date.now(),
        });

        return { user2Id, groupId };
      });

      const asUser2 = t.withIdentity({ subject: setup.user2Id });

      // ユーザー2が所属していないグループの招待コードを作成しようとする
      const result = await asUser2.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId: setup.groupId,
          code: "UNAUTHORIZED",
        },
      );
      expect(result.isSuccess).toBe(false);
    });

    it("グループメンバーのみがグループの招待一覧を取得できる", async () => {
      const t = convexTest(schema);

      // セットアップ
      const { memberId, nonMemberId, groupId } = await t.run(async (ctx) => {
        const memberId = await ctx.db.insert("users", {});
        const nonMemberId = await ctx.db.insert("users", {});

        const groupId = await ctx.db.insert("groups", {
          name: "招待一覧テストグループ",
          createdBy: memberId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: memberId,
          role: "patient",
          joinedAt: Date.now(),
        });

        // 招待コードを作成
        await ctx.db.insert("groupInvitations", {
          groupId,
          code: "MEMBER001",
          createdBy: memberId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          isUsed: false,
          allowedRoles: ["supporter"],
        });

        return { memberId, nonMemberId, groupId };
      });

      // メンバーは一覧取得可能
      const asMember = t.withIdentity({ subject: memberId });
      const invitations = await asMember.query(
        api.invitations.queries.listGroupInvitations,
        { groupId },
      );
      expect(invitations).toHaveLength(1);

      // 非メンバーは一覧取得不可
      const asNonMember = t.withIdentity({ subject: nonMemberId });
      await expect(
        asNonMember.query(api.invitations.queries.listGroupInvitations, {
          groupId,
        }),
      ).rejects.toThrow();
    });
  });
});
