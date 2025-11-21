"use client";

import { Bell } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PushNotificationPrompt } from "@/features/push-notifications/components/push-notification-prompt";
import { PWAInstallButton } from "@/features/push-notifications/components/pwa-install-button";

/**
 * 通知設定カード（個人設定用）
 */
export function NotificationSettingsCard() {
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
        <div className="pt-4">
          <PWAInstallButton variant="outline" className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
