import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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
        void signIn("password", formData)
          .then(() => {
            setStep({
              email: formData.get("email") as string,
              password: formData.get("password") as string,
            });
          })
          .catch((error) => {
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
        <Input
          name="email"
          placeholder="メールアドレス"
          type="email"
          required
        />
      </div>
      <div>
        <Input
          name="password"
          placeholder="パスワード"
          type="password"
          required
          minLength={8}
        />
      </div>
      <input name="flow" value={step} type="hidden" />
      <Button type="submit" className="w-full">
        {step === "signIn" ? "ログイン" : "新規登録"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setStep(step === "signIn" ? "signUp" : "signIn");
        }}
        className="w-full"
      >
        {step === "signIn" ? "アカウントを作成" : "ログインに戻る"}
      </Button>
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
      <div className="flex justify-center">
        <InputOTP
          key={`code-${step.email}`}
          name="code"
          maxLength={8}
          required
          aria-label="認証コード"
          pattern="[0-9]{8}"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
            <InputOTPSlot index={6} />
            <InputOTPSlot index={7} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <input name="flow" type="hidden" value="email-verification" />
      <input name="email" value={step.email} type="hidden" />
      <input name="password" value={step.password} type="hidden" />
      <Button type="submit" className="w-full">
        確認
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setStep("signIn")}
        className="w-full"
      >
        キャンセル
      </Button>
    </form>
  );
}
