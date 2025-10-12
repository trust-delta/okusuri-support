import Resend from "@auth/core/providers/resend";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";

/**
 * Resend OTP provider for authentication
 */
export const ResendOTP = Resend({
  id: "resend-otp",
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
