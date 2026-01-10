"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import type { api } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  preloadedMembers: Preloaded<typeof api.groups.getGroupMembers>;
};

export function GroupMembersCard({ preloadedMembers }: Props) {
  const members = usePreloadedQuery(preloadedMembers);

  // メンバー情報が取得できない場合は何も表示しない（ページ側でリダイレクトされる）
  if (!members) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>メンバー一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member: (typeof members)[number]) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-muted"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.image ?? undefined} />
                  <AvatarFallback>
                    {member.displayName?.charAt(0) ??
                      member.name?.charAt(0) ??
                      "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {member.displayName || member.name || "名前未設定"}
                  </p>
                  {member.email && (
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant={member.role === "patient" ? "default" : "secondary"}
              >
                {member.role === "patient" ? "患者" : "支援者"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
