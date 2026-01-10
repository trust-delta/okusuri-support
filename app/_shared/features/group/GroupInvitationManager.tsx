"use client";

import { useAction, useQuery } from "convex/react";
import { Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/schema";

interface GroupInvitationManagerProps {
  groupId: Id<"groups">;
}

export function GroupInvitationManager({
  groupId,
}: GroupInvitationManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const createInvitation = useAction(api.invitations.createInvitation);
  const invitations = useQuery(api.invitations.listGroupInvitations, {
    groupId,
  });

  const handleCreateInvitation = async () => {
    setIsCreating(true);
    try {
      const result = await createInvitation({ groupId });

      // Result型のハンドリング
      if (!result.isSuccess) {
        toast.error(result.errorMessage);
        return;
      }

      toast.success("招待コードを作成しました");

      // 招待リンクをクリップボードにコピー
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(result.data.invitationLink);
        toast.success("招待リンクをクリップボードにコピーしました");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "招待コードの作成に失敗しました",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (invitationLink: string) => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      toast.success("招待リンクをクリップボードにコピーしました");
    } catch (_error) {
      toast.error("コピーに失敗しました");
    }
  };

  const handleShare = async (invitationLink: string, _code: string) => {
    // Web Share API が利用可能な場合
    if (navigator.share) {
      try {
        await navigator.share({
          title: "グループへの招待",
          text: `おくすりサポートのグループに招待します。以下のリンクから参加してください。`,
          url: invitationLink,
        });
        toast.success("共有しました");
      } catch (error) {
        // ユーザーがキャンセルした場合などはエラーを表示しない
        if (error instanceof Error && error.name !== "AbortError") {
          toast.error("共有に失敗しました");
        }
      }
    } else {
      // フォールバック: クリップボードにコピー
      await handleCopyLink(invitationLink);
    }
  };

  if (invitations === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-7 w-32" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeInvitations = invitations.filter(
    (inv: (typeof invitations)[number]) => !inv.isUsed,
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          グループに他のユーザーを招待できます
        </p>
        <Button
          onClick={handleCreateInvitation}
          disabled={isCreating}
          size="sm"
        >
          {isCreating ? "作成中..." : "招待コードを作成"}
        </Button>
      </div>

      {activeInvitations.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80">
            有効な招待コード
          </h3>
          {activeInvitations.map(
            (invitation: (typeof activeInvitations)[number]) => {
              const expiryDate = new Date(invitation.expiresAt);
              const now = new Date();
              const isExpired = expiryDate < now;

              return (
                <div
                  key={invitation._id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold text-foreground">
                          {invitation.code}
                        </code>
                        {isExpired && (
                          <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded">
                            期限切れ
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>
                          有効期限: {expiryDate.toLocaleDateString("ja-JP")}{" "}
                          {expiryDate.toLocaleTimeString("ja-JP")}
                        </p>
                        <p>
                          許可ロール:{" "}
                          {invitation.allowedRoles
                            .map((role: string) =>
                              role === "patient" ? "患者" : "サポーター",
                            )
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleCopyLink(invitation.invitationLink)
                        }
                        title="リンクをコピー"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleShare(
                            invitation.invitationLink,
                            invitation.code,
                          )
                        }
                        title="共有"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          有効な招待コードがありません
        </p>
      )}

      {invitations.filter((inv: (typeof invitations)[number]) => inv.isUsed)
        .length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-foreground/80 mb-3">
            使用済みの招待コード
          </h3>
          <div className="space-y-2">
            {invitations
              .filter((inv: (typeof invitations)[number]) => inv.isUsed)
              .map((invitation: (typeof invitations)[number]) => (
                <div
                  key={invitation._id}
                  className="border border-border rounded-lg p-3 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-muted-foreground">
                      {invitation.code}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      使用済み
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
