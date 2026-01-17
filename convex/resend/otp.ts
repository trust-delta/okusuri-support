import Resend from "@auth/core/providers/resend";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";

/**
 * テストアカウントの設定
 * Convex Dashboard > Settings > Environment Variables で設定:
 * - TEST_ACCOUNT_EMAIL: テストアカウントのメールアドレス（例: test@example.com）
 * - TEST_ACCOUNT_FIXED_OTP: 固定OTP（例: 12345678）
 *
 * ⚠️ 注意: 開発環境専用。本番環境には設定しないこと。
 */
const TEST_ACCOUNT_EMAIL = process.env.TEST_ACCOUNT_EMAIL;
const TEST_ACCOUNT_FIXED_OTP = process.env.TEST_ACCOUNT_FIXED_OTP;

/**
 * テストアカウントかどうかを判定
 */
function isTestAccount(email: string): boolean {
  if (!TEST_ACCOUNT_EMAIL || !TEST_ACCOUNT_FIXED_OTP) {
    return false;
  }
  return email.toLowerCase() === TEST_ACCOUNT_EMAIL.toLowerCase();
}

/**
 * Resend OTP provider for authentication
 */
export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    // テストアカウント用の固定OTPが設定されている場合はそれを使用
    // ⚠️ 開発環境専用の機能
    if (TEST_ACCOUNT_FIXED_OTP) {
      console.log(
        `[ResendOTP] 🧪 固定OTPモードが有効です（開発環境専用）: ${TEST_ACCOUNT_FIXED_OTP}`,
      );
      return TEST_ACCOUNT_FIXED_OTP;
    }

    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    // テストアカウントの場合はメール送信をスキップ
    if (isTestAccount(email)) {
      console.log(
        `[ResendOTP] 🧪 テストアカウント検出。メール送信をスキップします。`,
      );
      console.log(`[ResendOTP] 📧 Email: ${email}`);
      console.log(`[ResendOTP] 🔑 OTP: ${token}`);
      console.log(`[ResendOTP] ⚠️ このログは開発環境専用です。`);
      return;
    }

    console.log(`[ResendOTP] Sending OTP to ${email}: ${token}`);
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "My App <onboarding@resend.dev>",
      to: [email],
      subject: "Sign in to My App",
      text: `Your code is ${token}`,
    });

    if (error) {
      console.error("[ResendOTP] Failed to send email:", error);
      throw new Error("Could not send");
    }
    console.log(`[ResendOTP] Successfully sent OTP to ${email}`);
  },
});
