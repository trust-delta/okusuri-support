"use client";

import { useMutation, useQuery } from "convex/react";
import { Bell, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTimeFromMinutes, TimePicker } from "@/components/ui/time-picker";
import type { Id } from "@/schema";

interface NotificationTimeSettingsProps {
  groupId: Id<"groups">;
}

type TimingKey = "morningTime" | "noonTime" | "eveningTime" | "bedtimeTime";

const TIMING_LABELS: Record<TimingKey, { label: string; description: string }> =
  {
    morningTime: { label: "朝", description: "朝の服薬リマインダー" },
    noonTime: { label: "昼", description: "昼の服薬リマインダー" },
    eveningTime: { label: "夕", description: "夕方の服薬リマインダー" },
    bedtimeTime: { label: "就寝前", description: "就寝前の服薬リマインダー" },
  };

export function NotificationTimeSettings({
  groupId,
}: NotificationTimeSettingsProps) {
  const settingsResult = useQuery(api.groups.notification_settings.index.get, {
    groupId,
  });
  const updateMutation = useMutation(
    api.groups.notification_settings.index.update,
  );

  const [localSettings, setLocalSettings] = useState<Record<
    TimingKey,
    number
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 設定がロードされたらローカル状態を初期化
  useEffect(() => {
    if (settingsResult?.isSuccess && settingsResult.data) {
      setLocalSettings({
        morningTime: settingsResult.data.morningTime,
        noonTime: settingsResult.data.noonTime,
        eveningTime: settingsResult.data.eveningTime,
        bedtimeTime: settingsResult.data.bedtimeTime,
      });
      setHasChanges(false);
    }
  }, [settingsResult]);

  // 時刻変更ハンドラー
  const handleTimeChange = useCallback((key: TimingKey, value: number) => {
    setLocalSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setHasChanges(true);
  }, []);

  // 保存ハンドラー
  const handleSave = async () => {
    if (!localSettings) return;

    setIsLoading(true);

    const result = await updateMutation({
      groupId,
      morningTime: localSettings.morningTime,
      noonTime: localSettings.noonTime,
      eveningTime: localSettings.eveningTime,
      bedtimeTime: localSettings.bedtimeTime,
    });

    if (result.isSuccess) {
      toast.success("通知時刻を保存しました");
      setHasChanges(false);
    } else {
      toast.error(result.errorMessage);
    }

    setIsLoading(false);
  };

  // ローディング中
  if (!settingsResult || !localSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知時刻設定
          </CardTitle>
          <CardDescription>読み込み中...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // エラー時
  if (!settingsResult.isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知時刻設定
          </CardTitle>
          <CardDescription className="text-destructive">
            {settingsResult.errorMessage}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          通知時刻設定
        </CardTitle>
        <CardDescription>
          各時間帯のリマインダー通知時刻をカスタマイズできます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            Object.entries(TIMING_LABELS) as [
              TimingKey,
              { label: string; description: string },
            ][]
          ).map(([key, { label }]) => (
            <div key={key} className="space-y-2">
              <TimePicker
                label={label}
                value={localSettings[key]}
                onChange={(value) => handleTimeChange(key, value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                現在: {formatTimeFromMinutes(localSettings[key])}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            設定した時刻の前後15分以内に通知が送信されます
          </p>
          <Button
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
