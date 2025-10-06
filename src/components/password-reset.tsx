import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function PasswordReset() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"forgot" | { email: string }>("forgot");
  const [error, setError] = useState<string | null>(null);
  return step === "forgot" ? (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        void signIn("password", formData)
          .then(() => setStep({ email: formData.get("email") as string }))
          .catch(() => {
            setError(
              "認証コードの送信に失敗しました。もう一度お試しください。",
            );
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
        <p>パスワードリセット用の認証コードを送信します。</p>
      </div>
      <div>
        <input
          name="email"
          placeholder="メールアドレス"
          type="email"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <input name="flow" type="hidden" value="reset" />
      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
      >
        認証コードを送信
      </button>
    </form>
  ) : (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        void signIn("password", formData)
          .then(() => {
            window.location.href = "/dashboard";
          })
          .catch(() => {
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
          key={`reset-code-${step.email}`}
          name="code"
          placeholder="認証コード (8桁)"
          type="text"
          inputMode="numeric"
          required
          pattern="[0-9]{8}"
          maxLength={8}
          autoComplete="off"
          defaultValue=""
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
        />
      </div>
      <div>
        <input
          name="newPassword"
          placeholder="新しいパスワード"
          type="password"
          required
          minLength={8}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <input name="email" value={step.email} type="hidden" />
      <input name="flow" value="reset-verification" type="hidden" />
      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
      >
        パスワードをリセット
      </button>
      <button
        type="button"
        onClick={() => setStep("forgot")}
        className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        キャンセル
      </button>
    </form>
  );
}
