"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/10">
        <AvatarImage
          src={member.image || undefined}
          alt={member.name || member.displayName || "プロフィール画像"}
        />
        <AvatarFallback className="bg-primary/10 text-primary">
          {member.name?.charAt(0) ||
            member.displayName?.charAt(0) ||
            member.email?.charAt(0) ||
            "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">
            {member.displayName}
          </p>
          {isPatient ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
              患者
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
              サポーター
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          参加日: {joinDate.toLocaleDateString("ja-JP")}
        </p>
      </div>
    </div>
  );
}
