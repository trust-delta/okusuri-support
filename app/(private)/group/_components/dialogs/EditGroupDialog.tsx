"use client";

import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { api } from "@/api";
import { api as apiImport } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preloadedGroupDetails: Preloaded<typeof api.groups.getGroupDetails>;
};

export function EditGroupDialog({
  open,
  onOpenChange,
  preloadedGroupDetails,
}: Props) {
  const groupDetails = usePreloadedQuery(preloadedGroupDetails);
  const updateGroup = useMutation(apiImport.groups.updateGroup);

  const [name, setName] = useState(groupDetails?.name ?? "");
  const [description, setDescription] = useState(
    groupDetails?.description ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ダイアログが開いた時にフォームをリセット
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && groupDetails) {
      setName(groupDetails.name);
      setDescription(groupDetails.description ?? "");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupDetails) {
      return;
    }

    if (name.trim().length === 0) {
      toast.error("グループ名を入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateGroup({
        groupId: groupDetails._id,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (!result.isSuccess) {
        toast.error(result.errorMessage);
        return;
      }

      toast.success("グループ情報を更新しました");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update group:", error);
      toast.error("グループ情報の更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!groupDetails) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>グループ情報を編集</DialogTitle>
          <DialogDescription>
            グループの名前と説明を変更できます
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">グループ名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 家族の服薬管理"
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="グループの説明を入力してください"
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description.length}/500文字
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
