import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/api";
import { DangerZoneCard } from "./_components/DangerZoneCard";
import { GroupInfoCard } from "./_components/GroupInfoCard";
import { GroupMembersCard } from "./_components/GroupMembersCard";

export default async function GroupSettingsPage() {
  const token = await convexAuthNextjsToken();

  const groupStatus = await preloadQuery(
    api.groups.getUserGroupStatus,
    {},
    { token },
  );

  // 認証されていない場合
  if (groupStatus === null) {
    redirect("/login");
  }

  const groupStatusResult = preloadedQueryResult(groupStatus);

  // groupStatusResultがnullの場合
  if (!groupStatusResult) {
    redirect("/login");
  }

  // グループに参加していない場合
  if (!groupStatusResult.hasGroup) {
    redirect("/onboarding");
  }

  // アクティブグループIDを取得
  const activeGroupId =
    groupStatusResult.activeGroupId ?? groupStatusResult.groups[0]?.groupId;

  if (!activeGroupId) {
    redirect("/onboarding");
  }

  // グループ詳細を取得
  const groupDetails = await preloadQuery(
    api.groups.getGroupDetails,
    { groupId: activeGroupId },
    { token },
  );

  // グループ詳細の結果を確認（削除済みグループの場合はnullが返る）
  const groupDetailsResult = preloadedQueryResult(groupDetails);
  if (!groupDetailsResult) {
    // 削除済みまたはアクセス権がないグループの場合はダッシュボードへ
    redirect("/dashboard");
  }

  // グループメンバーを取得
  const groupMembers = await preloadQuery(
    api.groups.getGroupMembers,
    { groupId: activeGroupId },
    { token },
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          グループ設定
        </h1>

        <div className="space-y-6">
          {/* グループ情報 */}
          <GroupInfoCard preloadedGroupDetails={groupDetails} />

          {/* メンバー一覧 */}
          <GroupMembersCard preloadedMembers={groupMembers} />

          {/* 危険な操作 */}
          <DangerZoneCard preloadedGroupDetails={groupDetails} />
        </div>
      </div>
    </div>
  );
}
