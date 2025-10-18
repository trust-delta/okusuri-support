"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

interface MemberCardProps {
  member: {
    userId: string;
    displayName: string | undefined;
    name: string | null | undefined;
    email: string | null | undefined;
    image: string | null | undefined;
    role: "patient" | "supporter";
    joinedAt: number;
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const joinDate = new Date(member.joinedAt);
  const isPatient = member.role === "patient";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage
          src={member.image || undefined}
          alt={member.name || member.displayName || "プロフィール画像"}
        />
        <AvatarFallback>
          {member.name?.charAt(0) ||
            member.displayName?.charAt(0) ||
            member.email?.charAt(0) ||
            "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {member.displayName}
          </p>
          {isPatient ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
              患者
            </span>
          ) : (
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
}
