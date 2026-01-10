"use client";

import { Card, CardContent } from "@/components/ui/card";

interface GroupInfoCardProps {
  groupName: string | undefined;
  role: "patient" | "supporter";
}

export function GroupInfoCard({ groupName, role }: GroupInfoCardProps) {
  return (
    <Card>
      <CardContent>
        <p className="text-foreground/80">グループ: {groupName || "未設定"}</p>
        <p className="text-sm text-muted-foreground mt-1">
          役割: {role === "patient" ? "服薬者" : "サポーター"}
        </p>
      </CardContent>
    </Card>
  );
}
