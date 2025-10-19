"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ThemeToggle } from "@/shared/components/ui/theme-toggle";

export function ThemeCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>表示設定</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              テーマ
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ライト・ダーク・システム設定から選択できます
            </p>
          </div>
          <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  );
}
