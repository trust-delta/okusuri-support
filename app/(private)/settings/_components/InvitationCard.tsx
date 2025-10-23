"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupInvitationManager } from "@/features/group";
import type { Id } from "@/schema";

interface InvitationCardProps {
  groupId: Id<"groups">;
}

export function InvitationCard({ groupId }: InvitationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>グループ招待</CardTitle>
      </CardHeader>
      <CardContent>
        <GroupInvitationManager groupId={groupId} />
      </CardContent>
    </Card>
  );
}
