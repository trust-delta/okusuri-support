import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { api } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupSwitcherSection } from "./GroupSwitcherSection";
import { HeaderNavigation } from "./HeaderNavigation";

/**
 * app/(private)配下で共通で使用されるヘッダーコンポーネント
 *
 * 以下の要素を含みます：
 * - ユーザーアバターと名前
 * - ナビゲーションボタン（履歴、処方箋管理、設定）
 * - グループスイッチャー
 */
export async function Header() {
  const token = await convexAuthNextjsToken();

  // ユーザー情報とグループステータスをプリロード
  const [currentUser, groupStatus] = await Promise.all([
    preloadQuery(api.users.getCurrentUser, {}, { token }),
    preloadQuery(api.groups.getUserGroupStatus, {}, { token }),
  ]);

  const currentUserResult = preloadedQueryResult(currentUser);

  return (
    <div className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 space-y-4">
          {/* ユーザー情報とナビゲーションボタン */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {currentUserResult && (
                <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                  <AvatarImage
                    src={currentUserResult.image || undefined}
                    alt={currentUserResult.name || "プロフィール画像"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {currentUserResult.name?.charAt(0) ||
                      currentUserResult.email?.charAt(0) ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              {currentUserResult?.displayName && (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {currentUserResult.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentUserResult.email}
                  </p>
                </div>
              )}
            </div>
            <HeaderNavigation />
          </div>

          {/* グループスイッチャー */}
          <GroupSwitcherSection preloadedGroupStatus={groupStatus} />
        </div>
      </div>
    </div>
  );
}
