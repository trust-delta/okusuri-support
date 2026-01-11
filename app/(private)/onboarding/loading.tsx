/**
 * オンボーディングページのローディング状態
 */
export default function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          {/* タイトルスケルトン */}
          <div className="h-8 w-64 bg-muted rounded animate-pulse mx-auto" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse mx-auto" />

          {/* カードスケルトン */}
          <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
            {/* ボタンスケルトン */}
            <div className="space-y-4">
              <div className="h-24 w-full bg-muted rounded-lg animate-pulse" />
              <div className="h-24 w-full bg-muted rounded-lg animate-pulse" />
            </div>
          </div>

          {/* ローディングメッセージ */}
          <p className="text-sm text-muted-foreground">準備しています...</p>
        </div>
      </div>
    </div>
  );
}
