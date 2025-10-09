"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { PasswordReset } from "@/components/password-reset";
import { PasswordSignIn } from "@/components/password-sign-in";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"oauth" | "password" | "reset">("oauth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">ログイン</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            お薬サポートにログインしてください
          </p>
        </div>

        {mode === "oauth" ? (
          <>
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void signIn("github", { redirectTo: "/dashboard" })
                }
                className="w-full gap-3"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="GitHub"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHubでログイン
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void signIn("google", { redirectTo: "/dashboard" })
                }
                className="w-full gap-3"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="Google"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Googleでログイン
              </Button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">または</span>
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

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
          >
            ← トップページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
