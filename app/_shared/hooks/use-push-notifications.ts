"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/api";
import { Id } from "convex/_generated/dataModel";

export type PushNotificationPermission = "default" | "granted" | "denied";

interface UsePushNotificationsResult {
  permission: PushNotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: (groupId: Id<"groups">) => Promise<void>;
  unsubscribe: () => Promise<void>;
  requestPermission: () => Promise<PushNotificationPermission>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [permission, setPermission] = useState<PushNotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribeMutation = useMutation(api.push.mutations.subscribe);
  const unsubscribeMutation = useMutation(api.push.mutations.unsubscribe);

  // ブラウザサポートとパーミッションを確認
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSupport = () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // サブスクリプション状態を確認
  useEffect(() => {
    if (!isSupported) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error("サブスクリプション確認エラー:", err);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // 通知許可をリクエスト
  const requestPermission = useCallback(async (): Promise<PushNotificationPermission> => {
    if (!isSupported) {
      setError("このブラウザはプッシュ通知をサポートしていません");
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "通知許可リクエストに失敗しました";
      setError(message);
      return "denied";
    }
  }, [isSupported]);

  // サブスクリプション登録
  const subscribe = useCallback(
    async (groupId: Id<"groups">) => {
      if (!isSupported) {
        setError("このブラウザはプッシュ通知をサポートしていません");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 通知許可を確認
        let perm = permission;
        if (perm === "default") {
          perm = await requestPermission();
        }

        if (perm !== "granted") {
          throw new Error("通知許可が拒否されました");
        }

        // Service Worker登録を待機
        const registration = await navigator.serviceWorker.ready;

        // VAPID公開鍵を取得
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("VAPID公開鍵が設定されていません");
        }

        // サブスクリプション登録
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });

        // サブスクリプション情報をサーバーに保存
        await subscribeMutation({
          groupId,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
              auth: arrayBufferToBase64(subscription.getKey("auth")),
            },
          },
          userAgent: navigator.userAgent,
        });

        setIsSubscribed(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "サブスクリプション登録に失敗しました";
        setError(message);
        console.error("サブスクリプション登録エラー:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, permission, requestPermission, subscribeMutation]
  );

  // サブスクリプション解除
  const unsubscribe = useCallback(async () => {
    if (!isSupported) {
      setError("このブラウザはプッシュ通知をサポートしていません");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // サーバーから削除
        await unsubscribeMutation({
          endpoint: subscription.endpoint,
        });

        // ブラウザから削除
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "サブスクリプション解除に失敗しました";
      setError(message);
      console.error("サブスクリプション解除エラー:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, unsubscribeMutation]);

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// ユーティリティ関数: URLBase64をUint8Arrayに変換
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ユーティリティ関数: ArrayBufferをBase64に変換
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
