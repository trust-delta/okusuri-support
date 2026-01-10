"use client";

import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "./use-pwa-install";

/**
 * iOSユーザー向けのホーム画面追加案内バナー
 */
export function IOSPWAInstallBanner() {
  const { isIOS, isStandalone } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // ローカルストレージから閉じた履歴を確認
    const dismissed = localStorage.getItem("ios-pwa-banner-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // iOSかつPWAとしてインストールされていない場合のみ表示
    if (isIOS && !isStandalone) {
      // 3秒後に表示（ページ読み込み直後の表示を避ける）
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isIOS, isStandalone]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // 7日間表示しない
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("ios-pwa-banner-dismissed", String(expiresAt));
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <Alert className="relative mx-4 mt-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <Share className="size-4" />
      <AlertTitle className="mb-2 text-sm font-semibold">
        ホーム画面に追加して通知を受け取る
      </AlertTitle>
      <AlertDescription className="text-sm text-muted-foreground">
        <p className="mb-3">
          服薬リマインダー通知を受け取るには、このアプリをホーム画面に追加してください。
        </p>
        <ol className="ml-4 list-decimal space-y-1 text-xs">
          <li>
            画面下部の共有ボタン（
            <Share className="inline size-3" />
            ）をタップ
          </li>
          <li>「ホーム画面に追加」を選択</li>
          <li>「追加」をタップ</li>
        </ol>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 size-6"
        onClick={handleDismiss}
      >
        <X className="size-4" />
        <span className="sr-only">閉じる</span>
      </Button>
    </Alert>
  );
}
