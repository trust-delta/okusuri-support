"use node";

import { randomBytes } from "crypto";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * 暗号学的に安全な招待コードを生成するaction
 */
export const generateInvitationCodeAction = action({
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
      const randomIndex = randomBytesBuffer[i] % charset.length;
      code += charset[randomIndex];
    }

    return code;
  },
});
