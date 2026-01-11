import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("generateInvitationCodeAction", () => {
  it("8文字のコードを生成する", async () => {
    const t = convexTest(schema, modules);

    const code = await t.action(
      internal.invitation_code_generator.generateInvitationCodeAction,
    );

    expect(code).toBeDefined();
    expect(typeof code).toBe("string");
    expect(code).toHaveLength(8);
  });

  it("英数字のみでコードを生成する", async () => {
    const t = convexTest(schema, modules);

    const code = await t.action(
      internal.invitation_code_generator.generateInvitationCodeAction,
    );

    // 英数字のみを含むかチェック（a-z, A-Z, 0-9）
    expect(code).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it("複数回の呼び出しで一意のコードを生成する", async () => {
    const t = convexTest(schema, modules);

    // 複数回生成して一意性を確認
    const codes = await Promise.all([
      t.action(internal.invitation_code_generator.generateInvitationCodeAction),
      t.action(internal.invitation_code_generator.generateInvitationCodeAction),
      t.action(internal.invitation_code_generator.generateInvitationCodeAction),
      t.action(internal.invitation_code_generator.generateInvitationCodeAction),
      t.action(internal.invitation_code_generator.generateInvitationCodeAction),
    ]);

    // すべてのコードが異なることを確認（Set のサイズが配列の長さと一致）
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
