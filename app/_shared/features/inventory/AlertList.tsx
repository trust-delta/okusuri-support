"use client";

import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  Check,
  Package,
  Pill,
  XCircle,
} from "lucide-react";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Id } from "@/schema";

interface AlertListProps {
  groupId: Id<"groups">;
}

const ALERT_ICONS = {
  low_stock: Package,
  out_of_stock: XCircle,
  unexpected_consumption: Pill,
  overdose_warning: AlertTriangle,
};

const ALERT_LABELS = {
  low_stock: "残量不足",
  out_of_stock: "在庫切れ",
  unexpected_consumption: "予定外消費",
  overdose_warning: "過剰服用",
};

const SEVERITY_STYLES = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/**
 * アラート一覧コンポーネント
 */
export function AlertList({ groupId }: AlertListProps) {
  const alerts = useQuery(api.medications.getUnreadAlerts, { groupId });
  const markAsRead = useMutation(api.medications.markAsRead);
  const markAllAsRead = useMutation(api.medications.markAllAsRead);

  if (alerts === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            在庫アラート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            読み込み中...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Result型からデータを取得
  const alertsData = alerts.isSuccess ? alerts.data : [];

  if (alertsData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            在庫アラート
          </CardTitle>
          <CardDescription>未読のアラートはありません</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>すべてのアラートを確認済みです</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleMarkAsRead = async (alertId: Id<"inventoryAlerts">) => {
    const result = await markAsRead({ alertId });
    if (!result.isSuccess) {
      console.error(result.errorMessage);
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead({ groupId });
    if (!result.isSuccess) {
      console.error(result.errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              在庫アラート
              <Badge variant="destructive">{alertsData.length}</Badge>
            </CardTitle>
            <CardDescription>確認が必要なアラートがあります</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            すべて既読
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertsData.map((alert) => {
          const Icon = ALERT_ICONS[alert.alertType];
          const timeAgo = formatDistanceToNow(new Date(alert.createdAt), {
            addSuffix: true,
            locale: ja,
          });

          return (
            <div
              key={alert._id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div
                className={`p-2 rounded-full ${SEVERITY_STYLES[alert.severity]}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {ALERT_LABELS[alert.alertType]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo}
                  </span>
                </div>
                <p className="mt-1 text-sm">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.medicineName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMarkAsRead(alert._id)}
                className="flex-shrink-0"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
