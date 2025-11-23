"use client";

import { useAction } from "convex/react";
import { Check, Copy, Link, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
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
import type { Id } from "@/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"groups">;
};

export function InviteDialog({ open, onOpenChange, groupId }: Props) {
  const createInvitation = useAction(api.invitations.createInvitation);

  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // ダイアログを閉じる時にリセット
      setInvitationLink(null);
      setInvitationCode(null);
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  const handleCreateInvitation = async () => {
    setIsCreating(true);
    try {
      const result = await createInvitation({ groupId });

      if (!result.isSuccess) {
        toast.error(result.errorMessage);
        return;
      }

      setInvitationLink(result.data.invitationLink);
      setInvitationCode(result.data.code);
      toast.success("招待リンクを作成しました");
    } catch (error) {
      console.error("Failed to create invitation:", error);
      toast.error("招待リンクの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!invitationLink) return;

    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("招待リンクをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast.error("コピーに失敗しました");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>メンバーを招待</DialogTitle>
          <DialogDescription>
            招待リンクを作成して、グループに新しいメンバーを招待できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!invitationLink ? (
            // 招待リンクがまだ作成されていない場合
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <Link className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                招待リンクを作成してメンバーを招待しましょう
              </p>
              <Button
                onClick={handleCreateInvitation}
                disabled={isCreating}
                className="gap-2"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                招待リンクを作成
              </Button>
            </div>
          ) : (
            // 招待リンクが作成された場合
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  ✓ 招待リンクを作成しました
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  このリンクは7日間有効です
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">招待コード</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={invitationCode ?? ""}
                    readOnly
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">招待リンク</Label>
                <div className="flex gap-2">
                  <Input
                    id="link"
                    value={invitationLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  💡{" "}
                  このリンクを招待したい人に共有してください。リンクをクリックすると、グループに参加できます。
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {invitationLink ? (
            <Button onClick={() => handleOpenChange(false)}>閉じる</Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              キャンセル
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
