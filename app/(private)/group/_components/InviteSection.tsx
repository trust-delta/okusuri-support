"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Check, Clock, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import type { Id } from "@/schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  groupId: Id<"groups">;
};

export function InviteSection({ groupId }: Props) {
  const invitations = useQuery(api.invitations.listGroupInvitations, {
    groupId,
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!invitations) {
    return null;
  }

  const activeInvitations = invitations.filter((inv) => !inv.isUsed);
  const usedInvitations = invitations.filter((inv) => inv.isUsed);

  const handleCopyLink = async (link: string, code: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      toast.success("招待リンクをコピーしました");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (_error) {
      toast.error("コピーに失敗しました");
    }
  };

  const isExpired = (expiresAt: number) => {
    return Date.now() > expiresAt;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>招待管理</CardTitle>
        <CardDescription>グループへの招待リンクを管理します</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {/* アクティブな招待 */}
          <AccordionItem value="active">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span>アクティブな招待</span>
                <Badge variant="default">{activeInvitations.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {activeInvitations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                  アクティブな招待はありません
                </p>
              ) : (
                <div className="space-y-3">
                  {activeInvitations.map((invitation) => (
                    <div
                      key={invitation._id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {invitation.code}
                            </code>
                            {isExpired(invitation.expiresAt) && (
                              <Badge variant="destructive">期限切れ</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                有効期限:{" "}
                                {format(
                                  new Date(invitation.expiresAt),
                                  "PPP p",
                                  { locale: ja },
                                )}
                              </span>
                            </div>
                            <div>
                              許可ロール:{" "}
                              {invitation.allowedRoles
                                .map((r) =>
                                  r === "patient" ? "患者" : "支援者",
                                )
                                .join("、")}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopyLink(
                              invitation.invitationLink,
                              invitation.code,
                            )
                          }
                          className="gap-2 shrink-0"
                        >
                          {copiedCode === invitation.code ? (
                            <>
                              <Check className="h-4 w-4" />
                              コピー済み
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              リンクをコピー
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 使用済みの招待 */}
          <AccordionItem value="used">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span>使用済みの招待</span>
                <Badge variant="secondary">{usedInvitations.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {usedInvitations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                  使用済みの招待はありません
                </p>
              ) : (
                <div className="space-y-3">
                  {usedInvitations.map((invitation) => (
                    <div
                      key={invitation._id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 opacity-60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {invitation.code}
                            </code>
                            <Badge variant="secondary">使用済み</Badge>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            使用日時:{" "}
                            {invitation.usedAt
                              ? format(new Date(invitation.usedAt), "PPP p", {
                                  locale: ja,
                                })
                              : "不明"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
