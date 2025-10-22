import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/convex";
import { GroupInfoCard } from "./_components/GroupInfoCard";
import { GroupSwitcherSection } from "./_components/GroupSwitcherSection";
import { MedicationSection } from "./_components/MedicationSection";
import { MembersSection } from "./_components/MembersSection";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 space-y-4">
          {/* ヘッダー（Server Component内で直接レンダリング） */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {currentUserResult && (
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={currentUserResult.image || undefined}
                    alt={currentUserResult.name || "プロフィール画像"}
                  />
                  <AvatarFallback>
                    {currentUserResult.name?.charAt(0) ||
                      currentUserResult.email?.charAt(0) ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ダッシュボード
                </h1>
                {currentUserResult?.displayName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ようこそ、{currentUserResult.displayName}さん
                  </p>
                )}
              </div>
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">設定</span>
              </Button>
            </Link>
          </div>

          {/* グループスイッチャー */}
          <GroupSwitcherSection preloadedGroupStatus={groupStatus} />
        </div>

        {/* グループ情報カード */}
        <GroupInfoCard
          groupName={activeGroup.groupName}
          role={activeGroup.role}
        />

        {/* メンバーリスト */}
        <div className="mt-6">
          <MembersSection preloadedGroupMembers={groupMembers} />
        </div>

        {/* 服薬記録 */}
        <div className="mt-6">
          <MedicationSection groupId={activeGroup.groupId} />
        </div>
      </div>
    </div>
  );
}
