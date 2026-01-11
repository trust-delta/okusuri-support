"use node";

import { randomBytes } from "node:crypto";
import { internalAction } from "./_generated/server";

/**
 * 暗号学的に安全な招待コードを生成する内部action
 * クライアントから直接呼び出し不可
 */
export const generateInvitationCodeAction = internalAction({
  args: {},
  handler: async () => {
    // 62進数の文字セット（a-z, A-Z, 0-9）
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const codeLength = 8;

    // 暗号学的に安全な乱数を生成
    const randomBytesBuffer = randomBytes(codeLength);

    // バイト列を62進数の文字セットにマッピング
    let code = "";
    for (let i = 0; i < codeLength; i++) {
      const byte = randomBytesBuffer[i] ?? 0;
      const randomIndex = byte % charset.length;
      code += charset[randomIndex];
    }

    return code;
  },
});
