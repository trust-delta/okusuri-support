/**
 * 設定ページのローディング状態
 */
export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダースケルトン */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        </div>

        <div className="space-y-6">
          {/* プロフィール設定カードスケルトン */}
          <div className="bg-card rounded-lg shadow p-6">
            <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-4">
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* テーマ設定カードスケルトン */}
          <div className="bg-card rounded-lg shadow p-6">
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="flex gap-3">
              {["theme-1", "theme-2", "theme-3"].map((id) => (
                <div
                  key={id}
                  className="h-10 w-24 bg-muted rounded animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* グループ招待カードスケルトン */}
          <div className="bg-card rounded-lg shadow p-6">
            <div className="h-6 w-48 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-20 w-full bg-muted rounded animate-pulse" />
              <div className="h-20 w-full bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* アカウント設定カードスケルトン */}
          <div className="bg-card rounded-lg shadow p-6">
            <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
