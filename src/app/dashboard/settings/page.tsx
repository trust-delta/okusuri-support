"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">設定</h1>
          <Button variant="ghost" onClick={() => router.back()}>
            戻る
          </Button>
        </div>

        <div className="space-y-6">
          {/* テーマ設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">表示設定</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">テーマ</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ライト・ダーク・システム設定から選択できます
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* アカウント設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">アカウント</h2>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void signOut()}
            >
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
