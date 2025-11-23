import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/api";
import type { Id } from "@/schema";
import { GroupInfoCard } from "./_components/GroupInfoCard";
import { MedicationSection } from "./_components/MedicationSection";
import { MembersSection } from "./_components/MembersSection";

interface DashboardPageProps {
  searchParams: Promise<{ groupId?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const token = await convexAuthNextjsToken();
  const groupStatus = await preloadQuery(
    api.groups.getUserGroupStatus,
    {},
    { token },
  );

  // 認証されていない場合はログインページへ
  if (groupStatus === null) {
    redirect("/login");
  }

  const groupStatusResult = preloadedQueryResult(groupStatus);

  // groupStatusResultがnullの場合はログインページへ
  if (!groupStatusResult) {
    redirect("/login");
  }

  // グループに参加していない場合はオンボーディングへ
  if (!groupStatusResult.hasGroup) {
    redirect("/onboarding");
  }

  // URLパラメータからgroupIdを取得、なければDBのactiveGroupIdまたは最初のグループ
  const urlGroupId = params.groupId as Id<"groups"> | undefined;
  const activeGroupId =
    urlGroupId ||
    groupStatusResult.activeGroupId ||
    groupStatusResult.groups[0]?.groupId;
  const activeGroup = groupStatusResult.groups.find(
    (g): g is NonNullable<(typeof groupStatusResult.groups)[number]> =>
      g !== null && g.groupId === activeGroupId,
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
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          ダッシュボード
        </h1>

        {/* グループ情報カード */}
        <GroupInfoCard
          groupName={activeGroup.groupName}
          role={activeGroup.role}
        />

        {/* メンバーリスト */}
        <MembersSection preloadedGroupMembers={groupMembers} />

        {/* 服薬記録 */}
        <MedicationSection groupId={activeGroup.groupId} />
      </div>
    </div>
  );
}
