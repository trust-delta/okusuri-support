import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("createGroup - グループ作成", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.groups.mutations.createGroup, {
        name: "テストグループ",
        creatorRole: "patient",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("グループを作成できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.createGroup, {
        name: "テストグループ",
        creatorRole: "patient",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toBeDefined();

        // グループが作成されたことを確認
        const group = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(group?.name).toBe("テストグループ");
        expect(group?.createdBy).toBe(userId);
      }
    });

    it("説明付きでグループを作成できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.createGroup, {
        name: "テストグループ",
        description: "グループの説明",
        creatorRole: "supporter",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const group = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(group?.description).toBe("グループの説明");
      }
    });

    it("作成者がメンバーとして追加される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.createGroup, {
        name: "テストグループ",
        creatorRole: "patient",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const membership = await t.run(async (ctx) => {
          return await ctx.db
            .query("groupMembers")
            .withIndex("by_groupId", (q) => q.eq("groupId", result.data))
            .first();
        });
        expect(membership?.userId).toBe(userId);
        expect(membership?.role).toBe("patient");
      }
    });

    it("アクティブグループとして設定される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.createGroup, {
        name: "テストグループ",
        creatorRole: "patient",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const user = await t.run(async (ctx) => {
          return await ctx.db.get(userId);
        });
        expect(user?.activeGroupId).toBe(result.data);
      }
    });

    it("デフォルト処方箋が作成される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.createGroup, {
        name: "テストグループ",
        creatorRole: "patient",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const prescription = await t.run(async (ctx) => {
          return await ctx.db
            .query("prescriptions")
            .withIndex("by_groupId", (q) => q.eq("groupId", result.data))
            .first();
        });
        expect(prescription?.name).toBe("日常の薬");
      }
    });
  });
});

describe("updateGroup - グループ更新", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: "更新後の名前",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("グループが見つからない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      // 存在しないIDを生成するため、一度作成して削除
      const tempGroupId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("groups", {
          name: "一時グループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId: tempGroupId,
        name: "更新後の名前",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("グループが見つかりません");
      }
    });

    it("削除済みグループはエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "削除済みグループ",
          createdBy: userId,
          createdAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
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

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: "更新後の名前",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("このグループは削除されています");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
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

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: "更新後の名前",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });

    it("脱退済みメンバーはエラーを返す", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
          leftAt: Date.now(),
          leftBy: userId,
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: "更新後の名前",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });
  });

  describe("バリデーション", () => {
    it("グループ名が空文字の場合はエラーを返す", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: "   ",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("グループ名を入力してください");
      }
    });

    it("グループ名が100文字を超える場合はエラーを返す", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const longName = "a".repeat(101);
      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: longName,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "グループ名は100文字以内で入力してください",
        );
      }
    });

    it("説明が500文字を超える場合はエラーを返す", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const longDescription = "a".repeat(501);
      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        description: longDescription,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("説明は500文字以内で入力してください");
      }
    });
  });

  describe("正常系", () => {
    it("グループ名を更新できる", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: "更新後のグループ名",
      });

      expect(result.isSuccess).toBe(true);

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });
      expect(group?.name).toBe("更新後のグループ名");
    });

    it("説明を更新できる", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        description: "更新後の説明",
      });

      expect(result.isSuccess).toBe(true);

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });
      expect(group?.description).toBe("更新後の説明");
    });

    it("空の説明を設定するとundefinedになる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          description: "元の説明",
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

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        description: "   ",
      });

      expect(result.isSuccess).toBe(true);

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });
      expect(group?.description).toBeUndefined();
    });

    it("グループ名がトリムされる", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.updateGroup, {
        groupId,
        name: "  新しい名前  ",
      });

      expect(result.isSuccess).toBe(true);

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });
      expect(group?.name).toBe("新しい名前");
    });
  });
});

describe("completeOnboardingWithNewGroup - オンボーディング完了", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "テストユーザー",
          groupName: "テストグループ",
          role: "patient",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("オンボーディングを完了できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "テストユーザー",
          groupName: "テストグループ",
          role: "patient",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.groupId).toBeDefined();
      }
    });

    it("ユーザー名が設定される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "テストユーザー",
          groupName: "テストグループ",
          role: "patient",
        },
      );

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });
      expect(user?.displayName).toBe("テストユーザー");
    });

    it("グループに参加される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "テストユーザー",
          groupName: "テストグループ",
          role: "supporter",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const membership = await t.run(async (ctx) => {
          return await ctx.db
            .query("groupMembers")
            .withIndex("by_groupId", (q) =>
              q.eq("groupId", result.data.groupId),
            )
            .first();
        });
        expect(membership?.userId).toBe(userId);
        expect(membership?.role).toBe("supporter");
      }
    });

    it("アクティブグループとして設定される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "テストユーザー",
          groupName: "テストグループ",
          role: "patient",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const user = await t.run(async (ctx) => {
          return await ctx.db.get(userId);
        });
        expect(user?.activeGroupId).toBe(result.data.groupId);
      }
    });

    it("デフォルト処方箋が作成される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.groups.mutations.completeOnboardingWithNewGroup,
        {
          userName: "テストユーザー",
          groupName: "テストグループ",
          role: "patient",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const prescription = await t.run(async (ctx) => {
          return await ctx.db
            .query("prescriptions")
            .withIndex("by_groupId", (q) =>
              q.eq("groupId", result.data.groupId),
            )
            .first();
        });
        expect(prescription?.name).toBe("日常の薬");
      }
    });
  });
});

describe("joinGroup - グループ参加", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(api.groups.mutations.joinGroup, {
        groupId,
        role: "patient",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("エラーケース", () => {
    it("既にグループに参加している場合はエラーを返す", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

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

  describe("正常系", () => {
    it("グループに参加できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.joinGroup, {
        groupId,
        role: "supporter",
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toBeDefined();

        const membership = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(membership?.userId).toBe(userId);
        expect(membership?.role).toBe("supporter");
      }
    });

    it("脱退後に再参加できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });

        // 脱退済みのメンバーシップ
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now() - 1000,
          leftAt: Date.now(),
          leftBy: userId,
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.joinGroup, {
        groupId,
        role: "supporter",
      });

      expect(result.isSuccess).toBe(true);
    });
  });
});

describe("leaveGroup - グループ脱退", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(api.groups.mutations.leaveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("ユーザーが見つからない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        // ユーザーを作成して即削除（存在しないユーザーをシミュレート）
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.delete(userId);
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.leaveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("ユーザーが見つかりません");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.leaveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("グループメンバーではありません");
      }
    });
  });

  describe("最後のメンバー制約", () => {
    it("最後の1人のメンバーは脱退できない", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.leaveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "最後の1人のメンバーは脱退できません。グループを削除してください",
        );
      }
    });
  });

  describe("正常系", () => {
    it("グループから脱退できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, _userId2, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const _userId2 = await ctx.db.insert("users", {});
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
          userId: _userId2,
          role: "supporter",
          joinedAt: Date.now(),
        });

        return { userId, _userId2, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.leaveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(true);

      // メンバーシップが論理削除されていることを確認
      const membership = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("groupId"), groupId))
          .first();
      });
      expect(membership?.leftAt).toBeDefined();
      expect(membership?.leftBy).toBe(userId);
    });

    it("アクティブグループが別のグループに切り替わる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId1, groupId2 } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const userId2 = await ctx.db.insert("users", {});

        const groupId1 = await ctx.db.insert("groups", {
          name: "グループ1",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const groupId2 = await ctx.db.insert("groups", {
          name: "グループ2",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId1,
          userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId1,
          userId: userId2,
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId2,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // groupId1をアクティブグループに設定
        await ctx.db.patch(userId, { activeGroupId: groupId1 });

        return { userId, groupId1, groupId2 };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.groups.mutations.leaveGroup, {
        groupId: groupId1,
      });

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });
      expect(user?.activeGroupId).toBe(groupId2);
    });
  });
});

describe("deleteGroup - グループ削除", () => {
  describe("認証とメンバーシップ検証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(api.groups.mutations.deleteGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });

    it("ユーザーが見つからない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.delete(userId);
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.deleteGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("ユーザーが見つかりません");
      }
    });

    it("グループが見つからない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, tempGroupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const tempGroupId = await ctx.db.insert("groups", {
          name: "一時グループ",
          createdBy: userId,
          createdAt: Date.now(),
        });
        await ctx.db.delete(tempGroupId);
        return { userId, tempGroupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.deleteGroup, {
        groupId: tempGroupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("グループが見つかりません");
      }
    });

    it("既に削除済みのグループはエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "削除済みグループ",
          createdBy: userId,
          createdAt: Date.now(),
          deletedAt: Date.now(),
          deletedBy: userId,
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

      const result = await asUser.mutation(api.groups.mutations.deleteGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("このグループは既に削除されています");
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
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

      const result = await asUser.mutation(api.groups.mutations.deleteGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("グループメンバーではありません");
      }
    });
  });

  describe("複数メンバー制約", () => {
    it("メンバーが複数いるグループは削除できない", async () => {
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

      const result = await asUser.mutation(api.groups.mutations.deleteGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "メンバーが複数いるグループは削除できません。先に脱退してください",
        );
      }
    });
  });

  describe("正常系", () => {
    it("グループを削除できる", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.groups.mutations.deleteGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(true);

      // グループが論理削除されていることを確認
      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });
      expect(group?.deletedAt).toBeDefined();
      expect(group?.deletedBy).toBe(userId);
    });

    it("全メンバーシップが論理削除される", async () => {
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
          role: "patient",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.groups.mutations.deleteGroup, { groupId });

      // メンバーシップが論理削除されていることを確認
      const membership = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
          .first();
      });
      expect(membership?.leftAt).toBeDefined();
      expect(membership?.leftBy).toBe(userId);
    });

    it("関連する処方箋が論理削除される", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, prescriptionId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
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

        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId, prescriptionId };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.groups.mutations.deleteGroup, { groupId });

      // 処方箋が論理削除されていることを確認
      const prescription = await t.run(async (ctx) => {
        return await ctx.db.get(prescriptionId);
      });
      expect(prescription?.deletedAt).toBeDefined();
      expect(prescription?.deletedBy).toBe(userId);
    });

    it("関連する薬と服薬スケジュールが論理削除される", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, medicineId, scheduleId } = await t.run(
        async (ctx) => {
          const userId = await ctx.db.insert("users", {});
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

          const prescriptionId = await ctx.db.insert("prescriptions", {
            groupId,
            name: "テスト処方箋",
            startDate: "2025-01-01",
            isActive: true,
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const medicineId = await ctx.db.insert("medicines", {
            groupId,
            prescriptionId,
            name: "テスト薬",
            createdBy: userId,
            createdAt: Date.now(),
          });

          const scheduleId = await ctx.db.insert("medicationSchedules", {
            medicineId,
            groupId,
            timings: ["morning"],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { userId, groupId, medicineId, scheduleId };
        },
      );

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.groups.mutations.deleteGroup, { groupId });

      // 薬が論理削除されていることを確認
      const medicine = await t.run(async (ctx) => {
        return await ctx.db.get(medicineId);
      });
      expect(medicine?.deletedAt).toBeDefined();
      expect(medicine?.deletedBy).toBe(userId);

      // スケジュールが論理削除されていることを確認
      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });
      expect(schedule?.deletedAt).toBeDefined();
      expect(schedule?.deletedBy).toBe(userId);
    });

    it("関連する服薬記録が論理削除される", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId, recordId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
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

        const prescriptionId = await ctx.db.insert("prescriptions", {
          groupId,
          name: "テスト処方箋",
          startDate: "2025-01-01",
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const medicineId = await ctx.db.insert("medicines", {
          groupId,
          prescriptionId,
          name: "テスト薬",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const scheduleId = await ctx.db.insert("medicationSchedules", {
          medicineId,
          groupId,
          timings: ["morning"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const recordId = await ctx.db.insert("medicationRecords", {
          groupId,
          scheduleId,
          medicineId,
          patientId: userId,
          scheduledDate: "2025-01-01",
          timing: "morning",
          status: "taken",
          recordedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId, recordId };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.groups.mutations.deleteGroup, { groupId });

      // 服薬記録が論理削除されていることを確認
      const record = await t.run(async (ctx) => {
        return await ctx.db.get(recordId);
      });
      expect(record?.deletedAt).toBeDefined();
      expect(record?.deletedBy).toBe(userId);
    });

    it("アクティブグループが別のグループに切り替わる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId1, groupId2 } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});

        const groupId1 = await ctx.db.insert("groups", {
          name: "グループ1",
          createdBy: userId,
          createdAt: Date.now(),
        });

        const groupId2 = await ctx.db.insert("groups", {
          name: "グループ2",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId1,
          userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId2,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // groupId1をアクティブグループに設定
        await ctx.db.patch(userId, { activeGroupId: groupId1 });

        return { userId, groupId1, groupId2 };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.groups.mutations.deleteGroup, {
        groupId: groupId1,
      });

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });
      expect(user?.activeGroupId).toBe(groupId2);
    });

    it("他にグループがない場合はactiveGroupIdがundefinedになる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "唯一のグループ",
          createdBy: userId,
          createdAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "patient",
          joinedAt: Date.now(),
        });

        await ctx.db.patch(userId, { activeGroupId: groupId });

        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.groups.mutations.deleteGroup, { groupId });

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });
      expect(user?.activeGroupId).toBeUndefined();
    });
  });
});
