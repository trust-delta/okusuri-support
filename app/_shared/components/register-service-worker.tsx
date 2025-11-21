"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    // Service Workerを登録（開発・本番両方）
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "[Service Worker] Registration successful:",
            registration.scope,
          );

          // 更新をチェック
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[Service Worker] New version available");
                  // 必要に応じてユーザーに更新を通知
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[Service Worker] Registration failed:", error);
        });
    }
  }, []);

  return null;
}
