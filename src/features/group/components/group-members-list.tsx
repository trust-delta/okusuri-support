"use client";

import { Users } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useGroupMembers } from "../hooks/use-group-members";
import { MemberCard } from "./member-card";

interface GroupMembersListProps {
  groupId: Id<"groups">;
}

export function GroupMembersList({ groupId }: GroupMembersListProps) {
  const { members, isLoading } = useGroupMembers(groupId);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            グループメンバー
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          読み込み中...
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
