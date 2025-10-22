"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AuthPageLayout,
  OAuthSignIn,
  PasswordReset,
  PasswordSignIn,
} from "@/features/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"oauth" | "password" | "reset">("oauth");

  return (
    <AuthPageLayout
      title="ログイン"
      description="お薬サポートにログインしてください"
      showBackLink
    >
      {mode === "oauth" ? (
        <>
          <div className="space-y-4">
            <OAuthSignIn provider="github" redirectTo="/dashboard" />
            <OAuthSignIn provider="google" redirectTo="/dashboard" />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">
                または
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("password")}
            className="w-full"
          >
            メールアドレスでログイン
          </Button>
        </>
      ) : mode === "password" ? (
        <div className="space-y-4">
          <PasswordSignIn />
          <Button
            type="button"
            variant="link"
            onClick={() => setMode("reset")}
            className="w-full"
          >
            パスワードをお忘れですか?
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode("oauth")}
            className="w-full"
          >
            ← 他の方法でログイン
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <PasswordReset />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode("password")}
            className="w-full"
          >
            ← ログインに戻る
          </Button>
        </div>
      )}
    </AuthPageLayout>
  );
}
