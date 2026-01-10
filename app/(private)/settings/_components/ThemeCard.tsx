"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "./ThemeToggle";

export function ThemeCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>表示設定</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">テーマ</p>
            <p className="text-sm text-muted-foreground">
              ライト・ダーク・システム設定から選択できます
            </p>
          </div>
          <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  );
}
