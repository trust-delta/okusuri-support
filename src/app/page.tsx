import "./globals.css";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();

  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-center">お薬サポート</h1>
        <div>
          <a
            href="/auth/login"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            ログイン
          </a>
        </div>
      </div>
    </div>
  );
}
