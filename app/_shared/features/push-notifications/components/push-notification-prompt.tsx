"use client";

import { Bell, BellOff, Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePushNotifications } from "@/features/push-notifications/hooks/use-push-notifications";
import type { Id } from "@/schema";

interface PushNotificationPromptProps {
  groupId: Id<"groups">;
  onComplete?: () => void;
}

export function PushNotificationPrompt({
  groupId,
  onComplete,
}: PushNotificationPromptProps) {
  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [showPrompt, setShowPrompt] = useState(true);

  const handleSubscribe = async () => {
    await subscribe(groupId);
    if (onComplete) {
      onComplete();
    }
  };

  const handleUnsubscribe = async () => {
    await unsubscribe();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // サポートされていない場合は表示しない
  if (!isSupported) {
    return null;
  }

  // 既にサブスクライブ済みの場合
  if (isSubscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            プッシュ通知が有効です
          </CardTitle>
          <CardDescription>服薬時刻になると通知が届きます</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnsubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                通知を無効にする
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 拒否されている場合
  if (permission === "denied") {
    return (
      <Alert>
        <BellOff className="h-4 w-4" />
        <AlertDescription>
          ブラウザの設定で通知が拒否されています。設定を変更してから再度お試しください。
        </AlertDescription>
      </Alert>
    );
  }

  // プロンプトを非表示にした場合
  if (!showPrompt) {
    return null;
  }

  // 通知許可をリクエスト
  return (
    <Card>
      <CardHeader className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          服薬リマインダーを有効にしますか？
        </CardTitle>
        <CardDescription>服薬時刻になると通知でお知らせします</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                有効にする
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleDismiss}>
            後で
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
