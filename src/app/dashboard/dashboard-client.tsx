"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GroupMembersList } from "@/features/group";
import { MedicationRecorder } from "@/features/medication";
import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface DashboardClientProps {
  currentUser: Preloaded<typeof api.groups.getCurrentUser>;
  firstGroup: {
    groupId: Id<"groups">;
    groupName?: string;
    role: "patient" | "supporter";
  };
  groupMembers: Preloaded<typeof api.groups.getGroupMembers>;
  medicationRecords: Preloaded<typeof api.medications.getTodayRecords>;
  today: string;
}

export function DashboardClient({
  currentUser: preloadedCurrentUser,
  firstGroup,
  groupMembers: preloadedGroupMembers,
  medicationRecords: preloadedMedicationRecords,
  today,
}: DashboardClientProps) {
  const currentUser = usePreloadedQuery(preloadedCurrentUser);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {currentUser && (
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={currentUser.image || undefined}
                    alt={currentUser.name || "プロフィール画像"}
                  />
                  <AvatarFallback>
                    {currentUser.name?.charAt(0) ||
                      currentUser.email?.charAt(0) ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ダッシュボード
                </h1>
                {currentUser?.displayName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ようこそ、{currentUser.displayName}さん
                  </p>
                )}
              </div>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">設定</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-700 dark:text-gray-300">
            グループ: {firstGroup.groupName || "未設定"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            役割: {firstGroup.role === "patient" ? "服薬者" : "サポーター"}
          </p>
        </div>

        <div className="mt-6">
          <GroupMembersList preloadedMembers={preloadedGroupMembers} />
        </div>

        <div className="mt-6">
          <MedicationRecorder
            groupId={firstGroup.groupId}
            preloadedRecords={preloadedMedicationRecords}
            today={today}
          />
        </div>
      </div>
    </div>
  );
}
