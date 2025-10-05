"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { PasswordSignIn } from "@/components/password-sign-in";

export default function Home() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signUp" | "signIn">("signIn");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">お薬サポート</h1>
        <p className="text-gray-600">
          服薬管理を簡単に。家族みんなで見守りをサポート。
        </p>
        <div>
          <p>ログイン</p>
          <div>
            <button
              type="button"
              onClick={() => void signIn("github", { redirectTo: "/dashboard" })}
            >
              Sign in with GitHub
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void signIn("google", { redirectTo: "/dashboard" })}
            >
              Sign in with Google
            </button>
          </div>
          {/* passwordログイン　後ほど実装
          <div>
            <PasswordSignIn />
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
