"use client";

import type { FunctionReturnType } from "convex/server";
import { Users } from "lucide-react";
import type { api } from "../../../../convex/_generated/api";
import { MemberCard } from "./member-card";

interface GroupMembersListProps {
  members: FunctionReturnType<typeof api.groups.getGroupMembers> | null;
}

export function GroupMembersList({
  members: membersData,
}: GroupMembersListProps) {
  const members = !membersData
    ? []
    : [...membersData].sort((a, b) => {
        // 患者を先頭に
        if (a.role === "patient" && b.role !== "patient") return -1;
        if (a.role !== "patient" && b.role === "patient") return 1;
        // 同じロールなら参加日時順
        return a.joinedAt - b.joinedAt;
      });

  if (!membersData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            グループメンバー
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          メンバー情報を読み込めませんでした
        </p>
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
