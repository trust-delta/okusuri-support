import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.setup";

describe("createMedicineGroup - 薬名統合グループ作成", () => {
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

      const result = await t.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠", "ロキソニンS"],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("権限チェック", () => {
    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠", "ロキソニンS"],
        },
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
    it("薬名統合グループを作成できる", async () => {
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

      const result = await asUser.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠", "ロキソニンS"],
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const medicineGroup = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(medicineGroup?.canonicalName).toBe("ロキソニン");
        expect(medicineGroup?.medicineNames).toEqual([
          "ロキソニン錠",
          "ロキソニンS",
        ]);
      }
    });

    it("メモ付きで薬名統合グループを作成できる", async () => {
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

      const result = await asUser.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠"],
          notes: "NSAIDs",
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const medicineGroup = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(medicineGroup?.notes).toBe("NSAIDs");
      }
    });

    it("薬名の前後の空白がトリミングされる", async () => {
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

      const result = await asUser.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "  ロキソニン  ",
          medicineNames: ["  ロキソニン錠  ", "  ロキソニンS  "],
        },
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const medicineGroup = await t.run(async (ctx) => {
          return await ctx.db.get(result.data);
        });
        expect(medicineGroup?.canonicalName).toBe("ロキソニン");
        expect(medicineGroup?.medicineNames).toEqual([
          "ロキソニン錠",
          "ロキソニンS",
        ]);
      }
    });
  });

  describe("バリデーション", () => {
    it("空の代表名はエラーを返す", async () => {
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

      const result = await asUser.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "   ",
          medicineNames: ["ロキソニン錠"],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("代表名を入力してください");
      }
    });

    it("空の薬名リストはエラーを返す", async () => {
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

      const result = await asUser.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: [],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "少なくとも1つの薬名を指定してください",
        );
      }
    });

    it("既に他のグループに含まれている薬名はエラーを返す", async () => {
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
        // 既存の薬名統合グループを作成
        await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "既存グループ",
          medicineNames: ["重複薬"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, groupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.createMedicineGroup,
        {
          groupId,
          canonicalName: "新規グループ",
          medicineNames: ["重複薬", "新薬"],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toContain(
          "薬名「重複薬」は既に別のグループ「既存グループ」に含まれています",
        );
      }
    });
  });
});

describe("updateMedicineGroup - 薬名統合グループ更新", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const medicineGroupId = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
        return await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠"],
          createdBy: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.groups.mutations.updateMedicineGroup,
        {
          medicineGroupId,
          canonicalName: "新しい名前",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("代表名を更新できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineGroupId } = await t.run(async (ctx) => {
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
        const medicineGroupId = await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "元の名前",
          medicineNames: ["薬A"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, medicineGroupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.updateMedicineGroup,
        {
          medicineGroupId,
          canonicalName: "新しい名前",
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedGroup = await t.run(async (ctx) => {
        return await ctx.db.get(medicineGroupId);
      });
      expect(updatedGroup?.canonicalName).toBe("新しい名前");
    });

    it("薬名リストを更新できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineGroupId } = await t.run(async (ctx) => {
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
        const medicineGroupId = await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["薬A"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, medicineGroupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.updateMedicineGroup,
        {
          medicineGroupId,
          medicineNames: ["薬A", "薬B", "薬C"],
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedGroup = await t.run(async (ctx) => {
        return await ctx.db.get(medicineGroupId);
      });
      expect(updatedGroup?.medicineNames).toEqual(["薬A", "薬B", "薬C"]);
    });

    it("メモを更新できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineGroupId } = await t.run(async (ctx) => {
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
        const medicineGroupId = await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["薬A"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, medicineGroupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.updateMedicineGroup,
        {
          medicineGroupId,
          notes: "新しいメモ",
        },
      );

      expect(result.isSuccess).toBe(true);

      const updatedGroup = await t.run(async (ctx) => {
        return await ctx.db.get(medicineGroupId);
      });
      expect(updatedGroup?.notes).toBe("新しいメモ");
    });
  });

  describe("バリデーション", () => {
    it("他のグループに含まれている薬名で更新しようとするとエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineGroupId } = await t.run(async (ctx) => {
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
        // 既存のグループ
        await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "既存グループ",
          medicineNames: ["重複薬"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // 更新対象のグループ
        const medicineGroupId = await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "対象グループ",
          medicineNames: ["薬A"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, medicineGroupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.updateMedicineGroup,
        {
          medicineGroupId,
          medicineNames: ["重複薬"],
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toContain(
          "薬名「重複薬」は既に別のグループ「既存グループ」に含まれています",
        );
      }
    });

    it("存在しないグループの更新はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, fakeId } = await t.run(async (ctx) => {
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
        // 削除されるグループを作成
        const fakeId = await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "削除されるグループ",
          medicineNames: ["薬"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(fakeId);
        return { userId, fakeId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.updateMedicineGroup,
        {
          medicineGroupId: fakeId,
          canonicalName: "新しい名前",
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "指定された薬名グループが見つかりません",
        );
      }
    });
  });
});

describe("deleteMedicineGroup - 薬名統合グループ削除", () => {
  describe("認証", () => {
    it("認証されていない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const medicineGroupId = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "user1",
          createdAt: Date.now(),
        });
        return await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠"],
          createdBy: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(
        api.medications.groups.mutations.deleteMedicineGroup,
        {
          medicineGroupId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe("認証が必要です");
      }
    });
  });

  describe("正常系", () => {
    it("薬名統合グループを削除できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, medicineGroupId } = await t.run(async (ctx) => {
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
        const medicineGroupId = await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { userId, medicineGroupId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.deleteMedicineGroup,
        {
          medicineGroupId,
        },
      );

      expect(result.isSuccess).toBe(true);

      // 削除されていることを確認
      const deletedGroup = await t.run(async (ctx) => {
        return await ctx.db.get(medicineGroupId);
      });
      expect(deletedGroup).toBeNull();
    });
  });

  describe("エラー系", () => {
    it("存在しないグループの削除はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, fakeId } = await t.run(async (ctx) => {
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
        // 削除されるグループを作成
        const fakeId = await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "削除されるグループ",
          medicineNames: ["薬"],
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(fakeId);
        return { userId, fakeId };
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.deleteMedicineGroup,
        {
          medicineGroupId: fakeId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "指定された薬名グループが見つかりません",
        );
      }
    });

    it("グループメンバーでない場合はエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {});
      });

      const medicineGroupId = await t.run(async (ctx) => {
        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          createdBy: "otherUser",
          createdAt: Date.now(),
        });
        return await ctx.db.insert("medicineGroups", {
          groupId,
          canonicalName: "ロキソニン",
          medicineNames: ["ロキソニン錠"],
          createdBy: "otherUser",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(
        api.medications.groups.mutations.deleteMedicineGroup,
        {
          medicineGroupId,
        },
      );

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.errorMessage).toBe(
          "このグループのメンバーではありません",
        );
      }
    });
  });
});
