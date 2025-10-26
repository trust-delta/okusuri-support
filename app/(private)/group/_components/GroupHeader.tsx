"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { Edit, UserPlus } from "lucide-react";
import { useState } from "react";
import type { api } from "@/api";
import { Button } from "@/components/ui/button";
import { EditGroupDialog } from "./dialogs/EditGroupDialog";
import { InviteDialog } from "./dialogs/InviteDialog";

type Props = {
  preloadedGroupDetails: Preloaded<typeof api.groups.getGroupDetails>;
};

export function GroupHeader({ preloadedGroupDetails }: Props) {
  const groupDetails = usePreloadedQuery(preloadedGroupDetails);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  if (!groupDetails) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {groupDetails.name}
          </h1>
          {groupDetails.description && (
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {groupDetails.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            編集
          </Button>
          <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            メンバーを招待
          </Button>
        </div>
      </div>

      <EditGroupDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        preloadedGroupDetails={preloadedGroupDetails}
      />

      <InviteDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        groupId={groupDetails._id}
      />
    </>
  );
}
