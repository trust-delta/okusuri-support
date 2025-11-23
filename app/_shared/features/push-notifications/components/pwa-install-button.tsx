"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/features/push-notifications/hooks/use-pwa-install";

interface PWAInstallButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * PWAインストールボタン（Android/デスクトップ用）
 * beforeinstallpromptイベントが利用可能な場合のみ表示
 */
export function PWAInstallButton({
  variant = "default",
  size = "default",
  className,
}: PWAInstallButtonProps) {
  const { isInstallable, showInstallPrompt, isStandalone } = usePWAInstall();

  // インストール済み、またはインストール不可の場合は非表示
  if (isStandalone || !isInstallable) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={showInstallPrompt}
    >
      <Download className="mr-2 size-4" />
      アプリをインストール
    </Button>
  );
}
