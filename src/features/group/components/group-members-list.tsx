"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { Users } from "lucide-react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { api } from "../../../../convex/_generated/api";
import { MemberCard } from "./member-card";

interface GroupMembersListProps {
  preloadedMembers: Preloaded<typeof api.groups.getGroupMembers>;
}

export function GroupMembersList({ preloadedMembers }: GroupMembersListProps) {
  const membersData = usePreloadedQuery(preloadedMembers);

  const members = useMemo(() => {
    if (!membersData) return [];

    return [...membersData].sort((a, b) => {
      // 患者を先頭に
      if (a.role === "patient" && b.role !== "patient") return -1;
      if (a.role !== "patient" && b.role === "patient") return 1;
      // 同じロールなら参加日時順
      return a.joinedAt - b.joinedAt;
    });
  }, [membersData]);

  const isLoading = membersData === undefined;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            グループメンバー
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          グループメンバー
        </h2>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {members.length}人
        </span>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
        ))}
      </div>
    </div>
  );
}
