"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import type { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  preloadedGroupDetails: Preloaded<typeof api.groups.getGroupDetails>;
};

export function GroupInfoCard({ preloadedGroupDetails }: Props) {
  const groupDetails = usePreloadedQuery(preloadedGroupDetails);

  // グループ詳細が取得できない場合は何も表示しない（ページ側でリダイレクトされる）
  if (!groupDetails) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>グループ情報</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            グループ名
          </div>
          <p className="text-base text-foreground">{groupDetails.name}</p>
        </div>

        {groupDetails.description && (
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              説明
            </div>
            <p className="text-base text-foreground">
              {groupDetails.description}
            </p>
          </div>
        )}

        <div>
          <div className="text-sm font-medium text-muted-foreground">
            あなたの役割
          </div>
          <p className="text-base text-foreground">
            {groupDetails.myRole === "patient" ? "患者" : "支援者"}
          </p>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground">
            メンバー数
          </div>
          <p className="text-base text-foreground">
            {groupDetails.memberCount}人
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
