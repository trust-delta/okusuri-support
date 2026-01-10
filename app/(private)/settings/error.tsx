"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * 設定ページのエラーバウンダリ
 */
export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録
    console.error("Settings error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            エラーが発生しました
          </h1>
          <p className="text-muted-foreground">
            設定の読み込み中に問題が発生しました。
          </p>
          {error.digest && (
            <p className="text-sm text-muted-foreground">
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
