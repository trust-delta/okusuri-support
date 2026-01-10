import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="min-h-screen bg-background">
      {/* 共通ヘッダー */}
      <Suspense
        fallback={
          <div className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="h-12 bg-muted animate-pulse rounded-lg"></div>
            </div>
          </div>
        }
      >
        <Header />
      </Suspense>

      {/* ページコンテンツ */}
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center space-y-4">
              <Spinner className="h-10 w-10 mx-auto text-primary" />
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
