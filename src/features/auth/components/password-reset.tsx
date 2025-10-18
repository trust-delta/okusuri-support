import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/shared/components/ui/input-otp";

// パスワードリセット要求フォームスキーマ
const resetRequestFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "有効なメールアドレスを入力してください" }),
});

type ResetRequestFormSchema = z.infer<typeof resetRequestFormSchema>;

// パスワードリセット確認フォームスキーマ
const resetConfirmFormSchema = z.object({
  code: z
    .string()
    .length(8, { message: "認証コードは8桁です" })
    .regex(/^\d+$/, { message: "認証コードは数字のみです" }),
  newPassword: z
    .string()
    .min(8, { message: "新しいパスワードは8文字以上で入力してください" }),
});

type ResetConfirmFormSchema = z.infer<typeof resetConfirmFormSchema>;

export function PasswordReset() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"forgot" | { email: string }>("forgot");
  const [error, setError] = useState<string | null>(null);

  // パスワードリセット要求フォーム
  const resetRequestForm = useForm<ResetRequestFormSchema>({
    resolver: zodResolver(resetRequestFormSchema),
    defaultValues: {
      email: "",
    },
  });

  // パスワードリセット確認フォーム
  const resetConfirmForm = useForm<ResetConfirmFormSchema>({
    resolver: zodResolver(resetConfirmFormSchema),
    defaultValues: {
      code: "",
      newPassword: "",
    },
  });
  const handleResetRequest = async (values: ResetRequestFormSchema) => {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("flow", "reset");

    setError(null);
    try {
      await signIn("password", formData);
      setStep({ email: values.email });
    } catch {
      setError("認証コードの送信に失敗しました。もう一度お試しください。");
    }
  };

  const handleResetConfirm = async (values: ResetConfirmFormSchema) => {
    if (typeof step === "string") return;

    const formData = new FormData();
    formData.append("code", values.code);
    formData.append("newPassword", values.newPassword);
    formData.append("email", step.email);
    formData.append("flow", "reset-verification");

    setError(null);
    try {
      await signIn("password", formData);
      window.location.href = "/dashboard";
    } catch {
      setError("認証コードが正しくありません。もう一度お試しください。");
    }
  };

  return step === "forgot" ? (
    <Form {...resetRequestForm}>
      <form
        onSubmit={resetRequestForm.handleSubmit(handleResetRequest)}
        className="space-y-4"
      >
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <FormDescription>
          パスワードリセット用の認証コードを送信します。
        </FormDescription>
        <FormField
          control={resetRequestForm.control}
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
        <Button
          type="submit"
          disabled={resetRequestForm.formState.isSubmitting}
          className="w-full"
        >
          認証コードを送信
        </Button>
      </form>
    </Form>
  ) : (
    <Form {...resetConfirmForm}>
      <form
        onSubmit={resetConfirmForm.handleSubmit(handleResetConfirm)}
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
          control={resetConfirmForm.control}
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
        <FormField
          control={resetConfirmForm.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>新しいパスワード</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="新しいパスワード"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={resetConfirmForm.formState.isSubmitting}
          className="w-full"
        >
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
    </Form>
  );
}
