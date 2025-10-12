"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "../../../../convex/_generated/api";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"patient" | "supporter">(
    "supporter",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 現在のユーザー情報を取得
  const currentUser = useQuery(api.groups.getCurrentUser);

  // パラメータから招待コードを取得
  useEffect(() => {
    params.then((p) => {
      setInvitationCode(p.code);
    });
  }, [params]);

  // 既存ユーザーの表示名を自動入力
  useEffect(() => {
    if (currentUser?.displayName && !displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [currentUser, displayName]);

  // 招待コードの検証とグループ情報の取得
  const invitationInfo = useQuery(
    api.invitations.validateInvitationCode,
    invitationCode ? { code: invitationCode } : "skip",
  );

  const joinGroup = useMutation(api.groups.joinGroupWithInvitation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitationCode) {
      toast.error("招待コードが見つかりません");
      return;
    }

    // 表示名の検証（既存ユーザーの場合は省略可能）
    if (!currentUser?.displayName && displayName.trim().length === 0) {
      toast.error("表示名を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      await joinGroup({
        invitationCode,
        role: selectedRole,
        displayName: displayName.trim() || undefined,
      });

      toast.success("グループに参加しました！");
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "エラーが発生しました。もう一度お試しください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング中
  if (invitationInfo === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            招待情報を確認中...
          </p>
        </div>
      </div>
    );
  }

  // エラー状態（期限切れ、既に使用済み、無効なコード）
  if ("error" in invitationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              招待が無効です
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {invitationInfo.error}
            </p>
            <div className="mt-6">
              <Button onClick={() => router.push("/dashboard")}>
                ダッシュボードに戻る
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { groupName, allowedRoles, expiresAt } = invitationInfo.invitation;
  const expiryDate = new Date(expiresAt);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            グループへの招待
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            「{groupName}」に招待されています
          </p>
          <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
            有効期限: {expiryDate.toLocaleDateString("ja-JP")}{" "}
            {expiryDate.toLocaleTimeString("ja-JP")}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                表示名
              </label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                required={!currentUser?.displayName}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="山田 太郎"
                maxLength={50}
                disabled={!!currentUser?.displayName}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                {currentUser?.displayName
                  ? "現在の表示名が使用されます（変更する場合は設定ページから変更してください）"
                  : "グループ内で表示される名前です（1-50文字）"}
              </p>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                あなたの役割
              </p>
              <div className="space-y-2">
                {allowedRoles.includes("patient") && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={selectedRole === "patient"}
                      onChange={(e) =>
                        setSelectedRole(e.target.value as "patient")
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      服薬する人（患者）
                    </span>
                  </label>
                )}
                {allowedRoles.includes("supporter") && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="supporter"
                      checked={selectedRole === "supporter"}
                      onChange={(e) =>
                        setSelectedRole(e.target.value as "supporter")
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      サポートする人
                    </span>
                  </label>
                )}
              </div>
              {allowedRoles.length === 1 && allowedRoles[0] === "supporter" && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  このグループには既に患者が登録されているため、サポーター役割でのみ参加できます。
                </p>
              )}
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "参加中..." : "グループに参加する"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
