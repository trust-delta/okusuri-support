"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";

/**
 * 招待ページのエラーバウンダリ
 */
export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録
    console.error("Invite error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            招待の確認に失敗しました
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            招待コードの検証中に問題が発生しました。
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
              window.location.href = "/dashboard";
            }}
            variant="outline"
          >
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
