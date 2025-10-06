import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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
        <Input
          name="email"
          placeholder="メールアドレス"
          type="email"
          required
        />
      </div>
      <input name="flow" type="hidden" value="reset" />
      <Button type="submit" className="w-full">
        認証コードを送信
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
          key={`reset-code-${step.email}`}
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
      <div>
        <Input
          name="newPassword"
          placeholder="新しいパスワード"
          type="password"
          required
          minLength={8}
        />
      </div>
      <input name="email" value={step.email} type="hidden" />
      <input name="flow" value="reset-verification" type="hidden" />
      <Button type="submit" className="w-full">
        パスワードをリセット
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setStep("forgot")}
        className="w-full"
      >
        キャンセル
      </Button>
    </form>
  );
}
