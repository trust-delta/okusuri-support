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
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            グループ名
          </div>
          <p className="text-base text-gray-900 dark:text-gray-100">
            {groupDetails.name}
          </p>
        </div>

        {groupDetails.description && (
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              説明
            </div>
            <p className="text-base text-gray-900 dark:text-gray-100">
              {groupDetails.description}
            </p>
          </div>
        )}

        <div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            あなたの役割
          </div>
          <p className="text-base text-gray-900 dark:text-gray-100">
            {groupDetails.myRole === "patient" ? "患者" : "支援者"}
          </p>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            メンバー数
          </div>
          <p className="text-base text-gray-900 dark:text-gray-100">
            {groupDetails.memberCount}人
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
