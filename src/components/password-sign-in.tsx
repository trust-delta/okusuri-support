import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function PasswordSignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<
    "signIn" | "signUp" | { email: string; password: string }
  >("signIn");
  const [error, setError] = useState<string | null>(null);
  return step === "signIn" || step === "signUp" ? (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        console.log("[PasswordSignIn] Submitting:", {
          flow: formData.get("flow"),
          email: formData.get("email"),
        });
        void signIn("password", formData)
          .then(() => {
            console.log("[PasswordSignIn] signIn succeeded");
            setStep({
              email: formData.get("email") as string,
              password: formData.get("password") as string,
            });
          })
          .catch((error) => {
            console.error("[PasswordSignIn] signIn failed:", error);
            const errorMessage = error?.message || String(error);
            if (errorMessage.includes("InvalidAccountId")) {
              setError("メールアドレスまたはパスワードが正しくありません");
            } else {
              setError("ログインに失敗しました。もう一度お試しください。");
            }
          });
      }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div>
        <input
          name="email"
          placeholder="メールアドレス"
          type="email"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <input
          name="password"
          placeholder="パスワード"
          type="password"
          required
          minLength={8}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <input name="flow" value={step} type="hidden" />
      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
      >
        {step === "signIn" ? "ログイン" : "新規登録"}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep(step === "signIn" ? "signUp" : "signIn");
        }}
        className="w-full text-sm text-blue-600 hover:text-blue-500 transition-colors"
      >
        {step === "signIn" ? "アカウントを作成" : "ログインに戻る"}
      </button>
    </form>
  ) : (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        console.log("[PasswordSignIn] Verifying code:", {
          flow: formData.get("flow"),
          email: formData.get("email"),
          code: formData.get("code"),
        });
        void signIn("password", formData)
          .then(() => {
            console.log("[PasswordSignIn] Code verification succeeded");
            window.location.href = "/dashboard";
          })
          .catch((error) => {
            console.error("[PasswordSignIn] Code verification failed:", error);
            setError("認証コードが正しくありません。もう一度お試しください。");
          });
      }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div className="text-sm text-gray-600 mb-4">
        <p>{step.email} に認証コードを送信しました。</p>
        <p>メールをご確認ください。</p>
      </div>
      <div>
        <input
          key={`code-${step.email}`}
          name="code"
          placeholder="認証コード (8桁)"
          type="text"
          required
          pattern="[0-9]{8}"
          maxLength={8}
          autoComplete="off"
          defaultValue=""
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
        />
      </div>
      <input name="flow" type="hidden" value="email-verification" />
      <input name="email" value={step.email} type="hidden" />
      <input name="password" value={step.password} type="hidden" />
      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
      >
        確認
      </button>
      <button
        type="button"
        onClick={() => setStep("signIn")}
        className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        キャンセル
      </button>
    </form>
  );
}
