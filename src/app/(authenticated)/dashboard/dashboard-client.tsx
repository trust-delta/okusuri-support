"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { redirect } from "next/navigation";
import { GroupMembersList, GroupSwitcher } from "@/features/group";
import { MedicationRecorder } from "@/features/medication";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { api } from "@/shared/lib/convex";
import { DashboardHeader } from "./dashboard-header";

interface DashboardClientProps {
  preloadedCurrentUser: Preloaded<typeof api.users.getCurrentUser>;
  preloadedGroupStatus: Preloaded<typeof api.groups.getUserGroupStatus>;
  preloadedGroupMembers: Preloaded<typeof api.groups.getGroupMembers>;
}

export function DashboardClient({
  preloadedCurrentUser,
  preloadedGroupStatus,
  preloadedGroupMembers,
}: DashboardClientProps) {
  const currentUser = usePreloadedQuery(preloadedCurrentUser);
  const groupStatus = usePreloadedQuery(preloadedGroupStatus);
  const groupMembers = usePreloadedQuery(preloadedGroupMembers);

  // クライアントサイドでの認証チェック
  if (!groupStatus || !currentUser) {
    redirect("/login");
  }

  if (!groupStatus.hasGroup) {
    redirect("/onboarding");
  }

  // アクティブなグループを取得（未設定の場合は最初のグループ）
  const activeGroupId =
    groupStatus.activeGroupId || groupStatus.groups[0]?.groupId;
  const activeGroup = groupStatus.groups.find(
    (g) => g.groupId === activeGroupId,
  );

  if (!activeGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-gray-100">
          グループ情報の取得に失敗しました
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 space-y-4">
          <DashboardHeader currentUser={currentUser} />
          <div className="flex justify-end">
            <GroupSwitcher
              groups={groupStatus.groups}
              activeGroupId={groupStatus.activeGroupId}
            />
          </div>
        </div>

        <Card>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              グループ: {activeGroup.groupName || "未設定"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              役割: {activeGroup.role === "patient" ? "服薬者" : "サポーター"}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6">
          <GroupMembersList members={groupMembers} />
        </div>

        <div className="mt-6">
          <MedicationRecorder groupId={activeGroup.groupId} />
        </div>
      </div>
    </div>
  );
}
