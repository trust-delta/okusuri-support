"use client";

import { Card, CardContent } from "@/shared/components/ui/card";

interface GroupInfoCardProps {
  groupName: string | undefined;
  role: "patient" | "supporter";
}

export function GroupInfoCard({ groupName, role }: GroupInfoCardProps) {
  return (
    <Card>
      <CardContent>
        <p className="text-gray-700 dark:text-gray-300">
          グループ: {groupName || "未設定"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          役割: {role === "patient" ? "服薬者" : "サポーター"}
        </p>
      </CardContent>
    </Card>
  );
}
