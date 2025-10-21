"use client";

import { GroupInvitationManager } from "@/features/group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { Id } from "@/shared/lib/convex";

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
