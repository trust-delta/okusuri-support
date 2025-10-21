import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/lib/convex";
import { InviteForm } from "./_components/InviteForm";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const token = await convexAuthNextjsToken();

  // 現在のユーザー情報を取得
  const currentUser = await fetchQuery(api.users.getCurrentUser, {}, { token });

  // 招待コードの検証とグループ情報の取得
  const invitationInfo = await fetchQuery(
    api.invitations.validateInvitationCode,
    { code },
    { token },
  );

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
              <Button onClick={() => redirect("/dashboard")}>
                ダッシュボードに戻る
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { groupName, allowedRoles, expiresAt } = invitationInfo.invitation;

  return (
    <InviteForm
      invitationCode={code}
      groupName={groupName}
      allowedRoles={allowedRoles}
      expiresAt={expiresAt}
      currentUserDisplayName={currentUser?.displayName}
    />
  );
}
