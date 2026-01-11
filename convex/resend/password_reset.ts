import Resend from "@auth/core/providers/resend";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";

/**
 * Resend OTP provider for password reset
 */
export const ResendOTPPasswordReset = Resend({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
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
    console.log(
      `[ResendOTPPasswordReset] Sending reset code to ${email}: ${token}`,
    );
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "My App <onboarding@resend.dev>",
      to: [email],
      subject: "Reset your password in My App",
      text: `Your password reset code is ${token}`,
    });

    if (error) {
      console.error("[ResendOTPPasswordReset] Failed to send email:", error);
      throw new Error("Could not send");
    }
    console.log(
      `[ResendOTPPasswordReset] Successfully sent reset code to ${email}`,
    );
  },
});
