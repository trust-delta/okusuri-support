import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { formatJST, nowJST } from "@/lib/date-fns";
import { api } from "../../../convex/_generated/api";
import { DashboardClient } from "./dashboard-client";
export default async function DashboardPage() {
  const token = await convexAuthNextjsToken();
  const groupStatus = await preloadQuery(
    api.groups.getUserGroupStatus,
    {},
    { token },
  );
  const currentUser = await preloadQuery(
    api.groups.getCurrentUser,
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

  const firstGroup = groupStatusResult.groups[0];

  if (!firstGroup) {
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
      groupId: firstGroup.groupId,
    },
    { token },
  );

  const today = formatJST(nowJST(), "yyyy-MM-dd");
  const medicationRecords = await preloadQuery(
    api.medications.getTodayRecords,
    {
      groupId: firstGroup.groupId,
      scheduledDate: today,
    },
    { token },
  );

  return (
    <DashboardClient
      currentUser={currentUser}
      firstGroup={firstGroup}
      groupMembers={groupMembers}
      medicationRecords={medicationRecords}
      today={today}
    />
  );
}
