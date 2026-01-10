"use client";

import { useAction } from "convex/react";
import { Bell, Send } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PushNotificationPrompt } from "@/features/push-notifications/components/PushNotificationPrompt";
import { PWAInstallButton } from "@/features/push-notifications/components/PwaInstallButton";
import { usePushNotifications } from "@/features/push-notifications/hooks/use-push-notifications";

/**
 * 通知設定カード（個人設定用）
 */
export function NotificationSettingsCard() {
  const { isSubscribed } = usePushNotifications();
  const sendTestNotification = useAction(api.push.actions.sendTestNotification);
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSendTest = async () => {
    setIsSending(true);
    setTestResult(null);

    try {
      const result = await sendTestNotification();
      setTestResult({
        success: result.success,
        message: result.message || "テスト通知を送信しました",
      });
    } catch {
      setTestResult({
        success: false,
        message: "テスト通知の送信に失敗しました",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-muted-foreground" />
          <CardTitle>通知設定</CardTitle>
        </div>
        <CardDescription>
          服薬リマインダーの通知を受け取るための設定を行います
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PushNotificationPrompt />

        {/* テスト通知送信ボタン（サブスクライブ済みの場合のみ表示） */}
        {isSubscribed && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={isSending}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "送信中..." : "テスト通知を送信"}
            </Button>
            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="pt-4">
          <PWAInstallButton variant="outline" className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
