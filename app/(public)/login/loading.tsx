/**
 * ログインページのローディング状態
 */
export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          {/* ロゴ・タイトルスケルトン */}
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />

          {/* カードスケルトン */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
            {/* OAuthボタンスケルトン */}
            <div className="space-y-4">
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>

            {/* セパレータスケルトン */}
            <div className="h-px w-full bg-gray-200 dark:bg-gray-700 animate-pulse" />

            {/* メールログインボタンスケルトン */}
            <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>

          {/* ローディングメッセージ */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            読み込み中...
          </p>
        </div>
      </div>
    </div>
  );
}
