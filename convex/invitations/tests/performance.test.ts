/**
 * パフォーマンステスト - 招待機能
 *
 * このテストスイートは、招待コード生成、一覧表示、並行参加処理のパフォーマンスを測定します。
 *
 * 目標:
 * - 招待コード生成: 500ms以下
 * - 100件の招待一覧表示: 2秒以内
 * - 並行参加処理: 10件同時処理で整合性維持
 */

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";

describe("パフォーマンステスト - 招待機能", () => {
  describe("Task 17.1: 招待コード生成のレイテンシ測定", () => {
    it("Patient不在グループでの招待コード生成が500ms以内で完了", async () => {
      const t = convexTest(schema);

      // セットアップ: グループとメンバーを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "パフォーマンステストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId,
          role: "supporter",
          joinedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // レイテンシ測定
      const startTime = performance.now();
      await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "PERF001",
        },
      );
      const endTime = performance.now();
      const latency = endTime - startTime;

      // 500ms以内であることを確認
      expect(latency).toBeLessThan(500);
      console.log(
        `招待コード生成レイテンシ (Patient不在): ${latency.toFixed(2)}ms`,
      );
    });

    it("Patient存在グループでの招待コード生成が500ms以内で完了", async () => {
      const t = convexTest(schema);

      // セットアップ: Patient存在グループを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const patientUserId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "Patient存在グループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId,
          role: "supporter",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: patientUserId,
          role: "patient",
          joinedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // レイテンシ測定（Patient存在チェックを含む）
      const startTime = performance.now();
      await asUser.mutation(
        api.invitations.mutations.createInvitationInternal,
        {
          groupId,
          code: "PERF002",
        },
      );
      const endTime = performance.now();
      const latency = endTime - startTime;

      // 500ms以内であることを確認
      expect(latency).toBeLessThan(500);
      console.log(
        `招待コード生成レイテンシ (Patient存在): ${latency.toFixed(2)}ms`,
      );
    });

    it("複数回の招待コード生成で一貫したパフォーマンスを維持", async () => {
      const t = convexTest(schema);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "連続生成テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId,
          role: "supporter",
          joinedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const latencies: number[] = [];

      // 10回連続で招待コードを生成
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await asUser.mutation(
          api.invitations.mutations.createInvitationInternal,
          {
            groupId,
            code: `PERF${String(i + 10).padStart(3, "0")}`,
          },
        );
        const endTime = performance.now();
        latencies.push(endTime - startTime);
      }

      // 全ての生成が500ms以内であることを確認
      latencies.forEach((latency, index) => {
        expect(latency).toBeLessThan(500);
        console.log(`招待コード生成 #${index + 1}: ${latency.toFixed(2)}ms`);
      });

      // 平均レイテンシを計算
      const avgLatency =
        latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      console.log(`平均レイテンシ: ${avgLatency.toFixed(2)}ms`);
      expect(avgLatency).toBeLessThan(250); // 平均は250ms以下を期待
    });
  });

  describe("Task 17.2: 大量招待の一覧表示パフォーマンス確認", () => {
    it("100件の招待レコードの一覧取得が2秒以内で完了", async () => {
      const t = convexTest(schema);

      // セットアップ: 100件の招待レコードを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "大量招待テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 100件の招待レコードを作成
        const now = Date.now();
        const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7日後

        for (let i = 0; i < 100; i++) {
          await ctx.db.insert("groupInvitations", {
            groupId,
            code: `BULK${String(i).padStart(3, "0")}`,
            createdBy: userId,
            createdAt: now - i * 60 * 1000, // 各招待を1分ずつずらす
            expiresAt,
            isUsed: i % 10 === 0, // 10件に1件は使用済み
            allowedRoles: ["patient", "supporter"],
          });
        }

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // 一覧取得のレイテンシ測定
      const startTime = performance.now();
      const invitations = await asUser.query(
        api.invitations.queries.listGroupInvitations,
        { groupId },
      );
      const endTime = performance.now();
      const latency = endTime - startTime;

      // 100件取得できていることを確認
      expect(invitations).toHaveLength(100);

      // 2秒以内であることを確認
      expect(latency).toBeLessThan(2000);
      console.log(`100件の招待一覧取得レイテンシ: ${latency.toFixed(2)}ms`);
    });

    it("有効な招待のみフィルタリングした一覧取得が高速", async () => {
      const t = convexTest(schema);

      // セットアップ: 100件の招待レコード（半分は期限切れ）
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "フィルタテストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        const now = Date.now();
        const validExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
        const expiredExpiresAt = now - 1 * 24 * 60 * 60 * 1000;

        for (let i = 0; i < 100; i++) {
          await ctx.db.insert("groupInvitations", {
            groupId,
            code: `FILTER${String(i).padStart(3, "0")}`,
            createdBy: userId,
            createdAt: now - i * 60 * 1000,
            expiresAt: i < 50 ? validExpiresAt : expiredExpiresAt,
            isUsed: false,
            allowedRoles: ["patient", "supporter"],
          });
        }

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      // 全件取得のレイテンシ
      const startTimeAll = performance.now();
      const allInvitations = await asUser.query(
        api.invitations.queries.listGroupInvitations,
        { groupId },
      );
      const endTimeAll = performance.now();
      const latencyAll = endTimeAll - startTimeAll;

      expect(allInvitations).toHaveLength(100);
      console.log(`全件取得レイテンシ: ${latencyAll.toFixed(2)}ms`);

      // クライアント側でのフィルタリング（有効な招待のみ）
      const startTimeFilter = performance.now();
      const validInvitations = allInvitations.filter(
        (inv) => !inv.isUsed && inv.expiresAt > Date.now(),
      );
      const endTimeFilter = performance.now();
      const latencyFilter = endTimeFilter - startTimeFilter;

      expect(validInvitations.length).toBe(50);
      console.log(`フィルタリングレイテンシ: ${latencyFilter.toFixed(2)}ms`);
      console.log(`合計: ${(latencyAll + latencyFilter).toFixed(2)}ms`);

      // 合計2秒以内であることを確認
      expect(latencyAll + latencyFilter).toBeLessThan(2000);
    });
  });

  describe("Task 17.3: 並行参加処理の負荷テスト", () => {
    it("10人が同時に異なる招待コードで参加できる", async () => {
      const t = convexTest(schema);

      // セットアップ: グループと10件の招待コードを作成
      const setup = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "並行参加テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 10件の招待コードを作成（Supporterのみ）
        const invitationCodes: string[] = [];
        const now = Date.now();
        const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

        for (let i = 0; i < 10; i++) {
          const code = `CONCURRENT${String(i).padStart(2, "0")}`;
          await ctx.db.insert("groupInvitations", {
            groupId,
            code,
            createdBy: creatorId,
            createdAt: now,
            expiresAt,
            isUsed: false,
            allowedRoles: ["supporter"],
          });
          invitationCodes.push(code);
        }

        // 10人の新規ユーザーを作成
        const newUserIds: Id<"users">[] = [];
        for (let i = 0; i < 10; i++) {
          const userId = await ctx.db.insert("users", {});
          newUserIds.push(userId);
        }

        return { groupId, invitationCodes, newUserIds };
      });

      // 並行参加処理を実行
      const startTime = performance.now();

      const joinPromises = setup.newUserIds.map(async (userId, index) => {
        const asUser = t.withIdentity({ subject: userId });
        return asUser.mutation(api.groups.mutations.joinGroupWithInvitation, {
          invitationCode: setup.invitationCodes[index],
          role: "supporter",
          displayName: `ユーザー${index + 1}`,
        });
      });

      const results = await Promise.all(joinPromises);
      const endTime = performance.now();
      const totalLatency = endTime - startTime;

      // 全員が正常に参加できたことを確認
      results.forEach((result, index) => {
        expect(result.isSuccess).toBe(true);
        console.log(`ユーザー${index + 1}が参加完了`);
      });

      console.log(`10人の並行参加処理時間: ${totalLatency.toFixed(2)}ms`);

      // グループメンバーが11人（作成者+10人）になっていることを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .filter((q) => q.eq(q.field("groupId"), setup.groupId))
          .collect();
      });

      expect(members).toHaveLength(11);
    });

    it("同一招待コードへの並行アクセスは1人のみ成功する", async () => {
      const t = convexTest(schema);

      // セットアップ: グループと1件の招待コードを作成
      const setup = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "競合テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 1件の招待コードを作成
        const code = "CONFLICT001";
        await ctx.db.insert("groupInvitations", {
          groupId,
          code,
          createdBy: creatorId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          isUsed: false,
          allowedRoles: ["supporter"],
        });

        // 5人の新規ユーザーを作成
        const newUserIds: Id<"users">[] = [];
        for (let i = 0; i < 5; i++) {
          const userId = await ctx.db.insert("users", {});
          newUserIds.push(userId);
        }

        return { groupId, code, newUserIds };
      });

      // 同一招待コードで5人が同時に参加を試みる
      const joinPromises = setup.newUserIds.map(async (userId, index) => {
        const asUser = t.withIdentity({ subject: userId });
        try {
          const result = await asUser.mutation(
            api.groups.mutations.joinGroupWithInvitation,
            {
              invitationCode: setup.code,
              role: "supporter",
              displayName: `競合ユーザー${index + 1}`,
            },
          );
          return { success: true, result };
        } catch (error) {
          return { success: false, error };
        }
      });

      const results = await Promise.all(joinPromises);

      // 成功は1人のみ
      const successCount = results.filter(
        (r) => r.success && r.result?.isSuccess,
      ).length;
      expect(successCount).toBe(1);
      console.log(
        `成功: ${successCount}人, 失敗: ${results.length - successCount}人`,
      );

      // グループメンバーが2人（作成者+1人）になっていることを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .filter((q) => q.eq(q.field("groupId"), setup.groupId))
          .collect();
      });

      expect(members).toHaveLength(2);

      // 招待コードが使用済みになっていることを確認
      const invitation = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupInvitations")
          .filter((q) => q.eq(q.field("code"), setup.code))
          .first();
      });

      expect(invitation?.isUsed).toBe(true);
    });

    it("Patient枠への競合アクセスは1人のみ成功する", async () => {
      const t = convexTest(schema);

      // セットアップ: Patient不在グループと招待コードを作成
      const setup = await t.run(async (ctx) => {
        const creatorId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "Patient競合テストグループ",
          createdBy: creatorId,
          createdAt: Date.now(),
        });
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: creatorId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 5件の招待コードを作成（全てPatient可能）
        const invitationCodes: string[] = [];
        for (let i = 0; i < 5; i++) {
          const code = `PATIENT${String(i).padStart(2, "0")}`;
          await ctx.db.insert("groupInvitations", {
            groupId,
            code,
            createdBy: creatorId,
            createdAt: Date.now(),
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            isUsed: false,
            allowedRoles: ["patient", "supporter"],
          });
          invitationCodes.push(code);
        }

        // 5人の新規ユーザーを作成
        const newUserIds: Id<"users">[] = [];
        for (let i = 0; i < 5; i++) {
          const userId = await ctx.db.insert("users", {});
          newUserIds.push(userId);
        }

        return { groupId, invitationCodes, newUserIds };
      });

      // 5人が同時にPatientロールで参加を試みる（異なる招待コード使用）
      const joinPromises = setup.newUserIds.map(async (userId, index) => {
        const asUser = t.withIdentity({ subject: userId });
        try {
          const result = await asUser.mutation(
            api.groups.mutations.joinGroupWithInvitation,
            {
              invitationCode: setup.invitationCodes[index],
              role: "patient",
              displayName: `Patient候補${index + 1}`,
            },
          );
          return { success: true, result, userId };
        } catch (error) {
          return { success: false, error, userId };
        }
      });

      const results = await Promise.all(joinPromises);

      // 成功は1人のみ（Patient制約により）
      const successCount = results.filter(
        (r) => r.success && r.result?.isSuccess,
      ).length;
      expect(successCount).toBe(1);
      console.log(
        `Patient参加成功: ${successCount}人, 失敗: ${results.length - successCount}人`,
      );

      // グループメンバーを確認
      const members = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .filter((q) => q.eq(q.field("groupId"), setup.groupId))
          .collect();
      });

      // 作成者（Supporter）+ 1人（Patient）= 2人
      expect(members).toHaveLength(2);

      // Patientが1人であることを確認
      const patients = members.filter((m) => m.role === "patient");
      expect(patients).toHaveLength(1);
    });
  });
});
