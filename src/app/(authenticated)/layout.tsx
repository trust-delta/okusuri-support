import { Suspense } from "react";

/**
 * 認証済みユーザー向けのレイアウト
 *
 * 非同期ページコンポーネント（dashboard, settings, invite等）が
 * 上位にサスペンドしないよう、Suspenseでラップしています。
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
