"use node";

import { randomBytes } from "node:crypto";
import { action } from "./_generated/server";

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
      const byte = randomBytesBuffer[i];
      if (byte !== undefined) {
        const randomIndex = byte % charset.length;
        code += charset[randomIndex];
      }
    }

    return code;
  },
});
