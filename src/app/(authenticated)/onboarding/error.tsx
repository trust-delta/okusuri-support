"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";

/**
 * オンボーディングページのエラーバウンダリ
 */
export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録
    console.error("Onboarding error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            エラーが発生しました
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            オンボーディングの読み込み中に問題が発生しました。
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              エラーID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            再試行
          </Button>
          <Button
            onClick={() => {
              window.location.href = "/";
            }}
            variant="outline"
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
