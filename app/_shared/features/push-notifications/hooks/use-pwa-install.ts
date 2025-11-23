"use client";

import { useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UsePWAInstallResult {
  isIOS: boolean;
  isStandalone: boolean;
  isInstallable: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  showInstallPrompt: () => Promise<void>;
}

/**
 * PWAのインストール状態を管理するフック
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS検出
    const checkIsIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // スタンドアロンモード検出（PWAとしてインストール済み）
    const checkIsStandalone = () => {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true
      );
    };

    setIsIOS(checkIsIOS());
    setIsStandalone(checkIsStandalone());

    // PWAインストールプロンプトイベントをキャプチャ
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  // インストールプロンプトを表示
  const showInstallPrompt = async () => {
    if (!deferredPrompt) {
      console.log("No deferred prompt available");
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Install prompt outcome: ${outcome}`);

    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return {
    isIOS,
    isStandalone,
    isInstallable: !!deferredPrompt,
    deferredPrompt,
    showInstallPrompt,
  };
}
