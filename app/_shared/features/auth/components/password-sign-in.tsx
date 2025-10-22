import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// ログイン/新規登録フォームスキーマ
const authFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "有効なメールアドレスを入力してください" }),
  password: z
    .string()
    .min(8, { message: "パスワードは8文字以上で入力してください" }),
});

type AuthFormSchema = z.infer<typeof authFormSchema>;

// OTP認証フォームスキーマ
const otpFormSchema = z.object({
  code: z
    .string()
    .length(8, { message: "認証コードは8桁です" })
    .regex(/^\d+$/, { message: "認証コードは数字のみです" }),
});

type OtpFormSchema = z.infer<typeof otpFormSchema>;

export function PasswordSignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<
    "signIn" | "signUp" | { email: string; password: string }
  >("signIn");
  const [error, setError] = useState<string | null>(null);

  // ログイン/新規登録フォーム
  const authForm = useForm<AuthFormSchema>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // OTP認証フォーム
  const otpForm = useForm<OtpFormSchema>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      code: "",
    },
  });
  const handleAuthSubmit = async (values: AuthFormSchema) => {
    if (typeof step !== "string") return;

    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("flow", step);

    setError(null);
    try {
      await signIn("password", formData);
      setStep({
        email: values.email,
        password: values.password,
      });
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : String(error);
      if (errorMessage.includes("InvalidAccountId")) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        setError("ログインに失敗しました。もう一度お試しください。");
      }
    }
  };

  const handleOtpSubmit = async (values: OtpFormSchema) => {
    if (typeof step === "string") return;

    const formData = new FormData();
    formData.append("code", values.code);
    formData.append("email", step.email);
    formData.append("password", step.password);
    formData.append("flow", "email-verification");

    setError(null);
    try {
      await signIn("password", formData);
      window.location.href = "/dashboard";
    } catch {
      setError("認証コードが正しくありません。もう一度お試しください。");
    }
  };

  return step === "signIn" || step === "signUp" ? (
    <Form {...authForm}>
      <form
        onSubmit={authForm.handleSubmit(handleAuthSubmit)}
        className="space-y-4"
      >
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <FormField
          control={authForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input type="email" placeholder="メールアドレス" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={authForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード</FormLabel>
              <FormControl>
                <Input type="password" placeholder="パスワード" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={authForm.formState.isSubmitting}
          className="w-full"
        >
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
    </Form>
  ) : (
    <Form {...otpForm}>
      <form
        onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
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
        <FormField
          control={otpForm.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>認証コード</FormLabel>
              <FormControl>
                <div className="flex justify-center">
                  <InputOTP maxLength={8} {...field} pattern="[0-9]{8}">
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={otpForm.formState.isSubmitting}
          className="w-full"
        >
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
    </Form>
  );
}
