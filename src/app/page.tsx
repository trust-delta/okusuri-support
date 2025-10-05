"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { signIn } = useAuthActions();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Authenticated>
        <AuthenticatedHome />
      </Authenticated>
      <Unauthenticated>
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-bold">お薬サポート</h1>
          <p className="text-gray-600">
            服薬管理を簡単に。家族みんなで見守りをサポート。
          </p>
          <button type="button" onClick={() => void signIn("github", { redirectTo: "/dashboard" })}>Sign in with GitHub</button>
        </div>
      </Unauthenticated>
    </div>
  );
}

function AuthenticatedHome() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-3xl font-bold">お薬サポート</h1>
      <p className="text-gray-600">ログイン済みです</p>
      <div className="flex gap-4 justify-center">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ダッシュボードへ
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}


