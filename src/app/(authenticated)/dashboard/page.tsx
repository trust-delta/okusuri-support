import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/shared/lib/convex";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const token = await convexAuthNextjsToken();
  const groupStatus = await preloadQuery(
    api.groups.getUserGroupStatus,
    {},
    { token },
  );
  const currentUser = await preloadQuery(
    api.users.getCurrentUser,
    {},
    { token },
  );

  // 認証されていない場合はログインページへ
  if (groupStatus === null || currentUser === null) {
    redirect("/login");
  }

  const groupStatusResult = preloadedQueryResult(groupStatus);
  const currentUserResult = preloadedQueryResult(currentUser);

  // groupStatusResultがnullの場合はログインページへ
  if (!groupStatusResult || !currentUserResult) {
    redirect("/login");
  }

  // グループに参加していない場合はオンボーディングへ
  if (!groupStatusResult.hasGroup) {
    redirect("/onboarding");
  }

  // アクティブなグループを取得（未設定の場合は最初のグループ）
  const activeGroupId =
    groupStatusResult.activeGroupId || groupStatusResult.groups[0]?.groupId;
  const activeGroup = groupStatusResult.groups.find(
    (g) => g.groupId === activeGroupId,
  );

  if (!activeGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-gray-100">
          グループ情報の取得に失敗しました
        </div>
      </div>
    );
  }

  // グループメンバーと服薬記録のデータをプリロード
  const groupMembers = await preloadQuery(
    api.groups.getGroupMembers,
    {
      groupId: activeGroup.groupId,
    },
    { token },
  );

  return (
    <DashboardClient
      preloadedCurrentUser={currentUser}
      preloadedGroupStatus={groupStatus}
      preloadedGroupMembers={groupMembers}
    />
  );
}
