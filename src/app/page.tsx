import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">お薬サポート</h1>
          <Link
            href="/login"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ログイン
          </Link>
        </nav>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-16">
        {/* ヒーローセクション */}
        <section className="text-center space-y-6 mb-20">
          <h2 className="text-5xl font-bold text-gray-900">
            服薬管理を簡単に。
            <br />
            家族みんなで見守りをサポート。
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            お薬の飲み忘れを防ぎ、家族で服薬状況を共有できるアプリです。
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              無料で始める
            </Link>
          </div>
        </section>

        {/* 機能紹介 */}
        <section className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center space-y-4 p-6">
            <div className="text-4xl">📝</div>
            <h3 className="text-xl font-semibold">簡単記録</h3>
            <p className="text-gray-600">
              お薬を飲んだらワンタップで記録。シンプルで使いやすいインターフェース。
            </p>
          </div>
          <div className="text-center space-y-4 p-6">
            <div className="text-4xl">👨‍👩‍👧‍👦</div>
            <h3 className="text-xl font-semibold">家族で共有</h3>
            <p className="text-gray-600">
              離れて暮らす家族の服薬状況も確認できます。安心の見守り機能。
            </p>
          </div>
          <div className="text-center space-y-4 p-6">
            <div className="text-4xl">📊</div>
            <h3 className="text-xl font-semibold">履歴管理</h3>
            <p className="text-gray-600">
              過去の服薬記録を一覧で確認。健康管理に役立つデータを蓄積。
            </p>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-50 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 お薬サポート. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
