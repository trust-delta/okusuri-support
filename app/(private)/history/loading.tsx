/**
 * 記録履歴ページのローディング状態
 */
export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダースケルトン */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* 月別統計カードスケルトン */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* カレンダースケルトン */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-80 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* 日別詳細スケルトン */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="text-center py-8">
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
