import { Suspense } from "react";
import { Header } from "./_components/Header";

/**
 * 認証済みユーザー向けのレイアウト
 *
 * 非同期ページコンポーネント（dashboard, settings, invite等）が
 * 上位にサスペンドしないよう、Suspenseでラップしています。
 * ヘッダーは全ページで共通表示されます。
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 共通ヘッダー */}
      <Suspense
        fallback={
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
        }
      >
        <Header />
      </Suspense>

      {/* ページコンテンツ */}
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
