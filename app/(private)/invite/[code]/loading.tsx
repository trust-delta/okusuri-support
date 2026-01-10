/**
 * 招待ページのローディング状態
 */
export default function InviteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          {/* タイトルスケルトン */}
          <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto" />

          {/* カードスケルトン */}
          <div className="bg-card rounded-lg shadow-lg p-6 space-y-4">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />

            <div className="space-y-3 pt-4">
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* ローディングメッセージ */}
          <p className="text-sm text-muted-foreground">
            招待情報を確認しています...
          </p>
        </div>
      </div>
    </div>
  );
}
