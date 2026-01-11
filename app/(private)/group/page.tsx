import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/api";
import { DangerZoneCard } from "./_components/DangerZoneCard";
import { GroupHeader } from "./_components/GroupHeader";
import { GroupMembersCard } from "./_components/GroupMembersCard";
import { GroupStatsCard } from "./_components/GroupStatsCard";
import { InviteSection } from "./_components/InviteSection";

export default async function GroupPage() {
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
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー: グループ名・説明、編集・招待ボタン */}
        <GroupHeader preloadedGroupDetails={groupDetails} />

        {/* 統計カード: あなたの役割、メンバー数、作成日 */}
        <GroupStatsCard preloadedGroupDetails={groupDetails} />

        {/* メンバー一覧 */}
        <GroupMembersCard preloadedMembers={groupMembers} />

        {/* 招待管理（アコーディオン） */}
        <InviteSection groupId={activeGroupId} />

        {/* 危険な操作 */}
        <DangerZoneCard preloadedGroupDetails={groupDetails} />
      </div>
    </div>
  );
}
