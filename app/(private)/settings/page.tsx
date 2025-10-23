import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/api";
import { AccountCard } from "./_components/AccountCard";
import { BackButton } from "./_components/BackButton";
import { InvitationSection } from "./_components/InvitationSection";
import { ProfileCard } from "./_components/ProfileCard";
import { ThemeCard } from "./_components/ThemeCard";

export default async function SettingsPage() {
  const token = await convexAuthNextjsToken();

  const currentUser = await preloadQuery(
    api.users.getCurrentUser,
    {},
    { token },
  );

  const groupStatus = await preloadQuery(
    api.groups.getUserGroupStatus,
    {},
    { token },
  );

  // 認証されていない場合はログインページへ
  if (currentUser === null || groupStatus === null) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            設定
          </h1>
          <BackButton />
        </div>

        <div className="space-y-6">
          {/* プロフィール設定 */}
          <ProfileCard preloadedCurrentUser={currentUser} />

          {/* テーマ設定 */}
          <ThemeCard />

          {/* グループ招待管理 */}
          <InvitationSection preloadedGroupStatus={groupStatus} />

          {/* アカウント設定 */}
          <AccountCard />
        </div>
      </div>
    </div>
  );
}
