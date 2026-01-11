/**
 * ログインページのローディング状態
 */
export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          {/* ロゴ・タイトルスケルトン */}
          <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mx-auto" />

          {/* カードスケルトン */}
          <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
            {/* OAuthボタンスケルトン */}
            <div className="space-y-4">
              <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
              <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
            </div>

            {/* セパレータスケルトン */}
            <div className="h-px w-full bg-muted animate-pulse" />

            {/* メールログインボタンスケルトン */}
            <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
          </div>

          {/* ローディングメッセージ */}
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    </div>
  );
}
