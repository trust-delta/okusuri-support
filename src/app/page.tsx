import './globals.css';

export default async function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-center">お薬サポート</h1>
        <div className="space-x-4">
          <a 
            href="/auth/login" 
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            ログイン
          </a>
          <a 
            href="/auth/logout"
            className="inline-block px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ログアウト
          </a>
        </div>
      </div>
    </div>
  );
}