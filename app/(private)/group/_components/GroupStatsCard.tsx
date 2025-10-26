"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, UserCircle, Users } from "lucide-react";
import type { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  preloadedGroupDetails: Preloaded<typeof api.groups.getGroupDetails>;
};

export function GroupStatsCard({ preloadedGroupDetails }: Props) {
  const groupDetails = usePreloadedQuery(preloadedGroupDetails);

  if (!groupDetails) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* あなたの役割 */}
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
              <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                あなたの役割
              </div>
              <Badge
                variant={
                  groupDetails.myRole === "patient" ? "default" : "secondary"
                }
                className="mt-1"
              >
                {groupDetails.myRole === "patient" ? "患者" : "支援者"}
              </Badge>
            </div>
          </div>

          {/* メンバー数 */}
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                メンバー数
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {groupDetails.memberCount}人
              </div>
            </div>
          </div>

          {/* 作成日 */}
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-2">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                作成日
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {format(new Date(groupDetails.createdAt), "PPP", {
                  locale: ja,
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
