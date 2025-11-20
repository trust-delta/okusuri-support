"use client";

import { Bell } from "lucide-react";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { PWAInstallButton } from "@/components/pwa-install-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Id } from "@/schema";

interface NotificationSettingsCardProps {
  groupId: Id<"groups">;
}

/**
 * グループ詳細画面の通知設定カード
 */
export function NotificationSettingsCard({
  groupId,
}: NotificationSettingsCardProps) {
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
        <PushNotificationPrompt groupId={groupId} />
        <div className="pt-4">
          <PWAInstallButton variant="outline" className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
