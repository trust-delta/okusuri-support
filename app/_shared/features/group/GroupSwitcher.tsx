"use client";

import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/schema";
import { CreateGroupDialog } from "./CreateGroupDialog";

interface GroupInfo {
  groupId: Id<"groups">;
  groupName?: string;
  role: "patient" | "supporter";
  joinedAt: number;
}

interface GroupSwitcherProps {
  groups: GroupInfo[];
  activeGroupId?: Id<"groups">;
}

export function GroupSwitcher({ groups, activeGroupId }: GroupSwitcherProps) {
  const setActiveGroup = useMutation(api.users.setActiveGroup);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URLパラメータからgroupIdを取得、なければactiveGroupIdまたは最初のグループ
  const urlGroupId = searchParams.get("groupId") as Id<"groups"> | null;
  const currentGroupId = urlGroupId || activeGroupId || groups[0]?.groupId;

  const handleGroupChange = async (groupId: string) => {
    const result = await setActiveGroup({ groupId: groupId as Id<"groups"> });

    if (!result.isSuccess) {
      toast.error(result.errorMessage);
      return;
    }

    toast.success("グループを切り替えました");

    // URLパラメータを更新（リロードせずに遷移）
    const params = new URLSearchParams(searchParams);
    params.set("groupId", groupId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentGroupId} onValueChange={handleGroupChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="グループを選択" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectItem key={group.groupId} value={group.groupId}>
              {group.groupName || "未設定"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsCreateDialogOpen(true)}
        className="h-9 w-9 p-0"
        title="新しいグループを作成"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>

      <CreateGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
