"use client";

import "./globals.css";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  return (
    <>
      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-bold">お薬サポート</h1>
            <button
              onClick={() => void signIn("auth0")}
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              ログイン
            </button>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">読み込み中...</div>
    </div>
  );
}
