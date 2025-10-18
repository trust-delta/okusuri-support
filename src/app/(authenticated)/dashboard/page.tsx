import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { GroupMembersList, GroupSwitcher } from "@/features/group";
import { MedicationRecorder } from "@/features/medication";
import { Card, CardContent } from "@/shared/components/ui/card";
import { api } from "@/shared/lib/convex";
import { DashboardHeader } from "./dashboard-header";
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

  const groupMembersResult = preloadedQueryResult(groupMembers);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 space-y-4">
          <DashboardHeader currentUser={currentUserResult} />
          <div className="flex justify-end">
            <GroupSwitcher
              groups={groupStatusResult.groups}
              activeGroupId={groupStatusResult.activeGroupId}
            />
          </div>
        </div>

        <Card>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              グループ: {activeGroup.groupName || "未設定"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              役割: {activeGroup.role === "patient" ? "服薬者" : "サポーター"}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6">
          <GroupMembersList members={groupMembersResult} />
        </div>

        <div className="mt-6">
          <MedicationRecorder groupId={activeGroup.groupId} />
        </div>
      </div>
    </div>
  );
}
