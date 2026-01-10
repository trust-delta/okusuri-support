/**
 * ダッシュボードページのローディング状態
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダースケルトン */}
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          </div>

          {/* グループスイッチャースケルトン */}
          <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        </div>

        {/* グループ情報カードスケルトン */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>

        {/* メンバーリストスケルトン */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {["member-1", "member-2", "member-3"].map((id) => (
              <div key={id} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 服薬記録スケルトン */}
        <div className="bg-card rounded-lg shadow p-6">
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
          <div className="h-32 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
