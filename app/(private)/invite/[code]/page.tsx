import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/api";
import { InviteErrorDisplay } from "./_components/InviteErrorDisplay";
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
  if (!invitationInfo.valid) {
    return <InviteErrorDisplay errorMessage={invitationInfo.error} />;
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
