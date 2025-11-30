import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("updateUserDisplayName - 表示名更新", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(
        api.users.mutations.updateUserDisplayName,
        {
          displayName: "新しい名前",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("バリデーション", () => {
    it("空文字の場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserDisplayName,
        {
          displayName: "",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("表示名を入力してください");
      }
    });

    it("空白のみの場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserDisplayName,
        {
          displayName: "   ",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("表示名を入力してください");
      }
    });

    it("50文字を超える場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserDisplayName,
        {
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
  });

  describe("正常系", () => {
    it("表示名を正常に更新できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserDisplayName,
        {
          displayName: "テストユーザー",
        },
      );

      expect(result.isSuccess).toBe(true);

      // DBの値を確認
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.displayName).toBe("テストユーザー");
    });

    it("前後の空白がトリムされる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserDisplayName,
        {
          displayName: "  テストユーザー  ",
        },
      );

      expect(result.isSuccess).toBe(true);

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.displayName).toBe("テストユーザー");
    });

    it("50文字ちょうどは許可される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserDisplayName,
        {
          displayName: "あ".repeat(50),
        },
      );

      expect(result.isSuccess).toBe(true);
    });
  });
});

describe("updateUserImage - プロフィール画像URL更新", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.users.mutations.updateUserImage, {
        imageUrl: "https://example.com/image.png",
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("バリデーション", () => {
    it("空文字の場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("画像URLを入力してください");
      }
    });

    it("空白のみの場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "   ",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("画像URLを入力してください");
      }
    });

    it("無効なURL形式の場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "invalid-url",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("有効な画像URLを入力してください");
      }
    });

    it("ftp://で始まるURLはエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "ftp://example.com/image.png",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("有効な画像URLを入力してください");
      }
    });
  });

  describe("正常系", () => {
    it("http://で始まるURLを正常に保存できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "http://example.com/image.png",
        },
      );

      expect(result.isSuccess).toBe(true);

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.image).toBe("http://example.com/image.png");
    });

    it("https://で始まるURLを正常に保存できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "https://example.com/image.png",
        },
      );

      expect(result.isSuccess).toBe(true);

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.image).toBe("https://example.com/image.png");
    });

    it("/_storage/で始まるURLを正常に保存できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "/_storage/abc123",
        },
      );

      expect(result.isSuccess).toBe(true);

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.image).toBe("/_storage/abc123");
    });

    it("前後の空白がトリムされる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImage,
        {
          imageUrl: "  https://example.com/image.png  ",
        },
      );

      expect(result.isSuccess).toBe(true);

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.image).toBe("https://example.com/image.png");
    });
  });
});

describe("generateUploadUrl - 画像アップロードURL生成", () => {
  it("アップロードURLを生成できる", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(api.users.mutations.generateUploadUrl, {});

    // convex-testでは実際のURLは生成されないが、関数が正常に動作することを確認
    expect(result).toBeDefined();
  });
});

describe("updateUserImageFromStorage - ストレージからの画像更新", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      // ダミーのストレージIDを作成
      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["test"]));
      });

      const result = await t.mutation(
        api.users.mutations.updateUserImageFromStorage,
        {
          storageId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("ストレージIDから画像を正常に更新できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, storageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const storageId = await ctx.storage.store(new Blob(["test image"]));
        return { userId, storageId };
      });

      const asUser = t.withIdentity({ subject: userId });
      const result = await asUser.mutation(
        api.users.mutations.updateUserImageFromStorage,
        {
          storageId,
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data.imageUrl).toBeDefined();
      }

      // DBの値を確認
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.customImageStorageId).toBe(storageId);
    });
  });
});

describe("setActiveGroup - アクティブグループ設定", () => {
  describe("認証チェック", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "dummy",
          createdAt: Date.now(),
        });
      });

      const result = await t.mutation(api.users.mutations.setActiveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("メンバーシップ確認", () => {
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
      const result = await asUser.mutation(api.users.mutations.setActiveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });
  });

  describe("正常系", () => {
    it("メンバーであればアクティブグループを設定できる", async () => {
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
      const result = await asUser.mutation(api.users.mutations.setActiveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(true);

      // DBの値を確認
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.activeGroupId).toBe(groupId);
    });

    it("patientロールでもアクティブグループを設定できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {});
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
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
      const result = await asUser.mutation(api.users.mutations.setActiveGroup, {
        groupId,
      });

      expect(result.isSuccess).toBe(true);
    });

    it("別のグループに切り替えできる", async () => {
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
          role: "supporter",
          joinedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId: groupId2,
          userId,
          role: "supporter",
          joinedAt: Date.now(),
        });

        // 最初にグループ1をアクティブに設定
        await ctx.db.patch(userId, { activeGroupId: groupId1 });

        return { userId, groupId1, groupId2 };
      });

      const asUser = t.withIdentity({ subject: userId });

      // グループ2に切り替え
      const result = await asUser.mutation(api.users.mutations.setActiveGroup, {
        groupId: groupId2,
      });

      expect(result.isSuccess).toBe(true);

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.activeGroupId).toBe(groupId2);
    });
  });
});
