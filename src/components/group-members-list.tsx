"use client";

import { useQuery } from "convex/react";
import { Users, UserCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface GroupMembersListProps {
  groupId: Id<"groups">;
}

export function GroupMembersList({ groupId }: GroupMembersListProps) {
  const members = useQuery(api.groups.getGroupMembers, { groupId });

  if (members === undefined) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            グループメンバー
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  // 患者を先頭に、サポーターを後にソート
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === "patient" && b.role !== "patient") return -1;
    if (a.role !== "patient" && b.role === "patient") return 1;
    return a.joinedAt - b.joinedAt;
  });

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
        {sortedMembers.map((member) => {
          const joinDate = new Date(member.joinedAt);
          const isPatient = member.role === "patient";

          return (
            <div
              key={member.userId}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <UserCircle className="h-10 w-10 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {member.displayName}
                  </p>
                  {isPatient && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      患者
                    </span>
                  )}
                  {!isPatient && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                      サポーター
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  参加日: {joinDate.toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
