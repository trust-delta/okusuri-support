"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../convex/_generated/api";

// グループ作成フォームスキーマ
const createGroupFormSchema = z.object({
  userName: z
    .string()
    .min(1, { message: "お名前を入力してください" })
    .max(50, { message: "お名前は50文字以内で入力してください" }),
  groupName: z
    .string()
    .min(1, { message: "グループ名を入力してください" })
    .max(100, { message: "グループ名は100文字以内で入力してください" }),
  groupDescription: z.string().max(500, {
    message: "グループの説明は500文字以内で入力してください",
  }),
  role: z.enum(["patient", "supporter"], {
    message: "役割を選択してください",
  }),
});

type CreateGroupFormSchema = z.infer<typeof createGroupFormSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useMutation(
    api.groups.completeOnboardingWithNewGroup,
  );

  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [invitationCode, setInvitationCode] = useState("");

  // グループ作成フォーム
  const form = useForm<CreateGroupFormSchema>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      userName: "",
      groupName: "",
      groupDescription: "",
      role: "patient",
    },
  });

  const handleSubmit = async (values: CreateGroupFormSchema) => {
    try {
      await completeOnboarding({
        userName: values.userName,
        groupName: values.groupName,
        groupDescription: values.groupDescription || undefined,
        role: values.role,
      });

      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "エラーが発生しました。もう一度お試しください。",
      );
    }
  };

  // モード選択画面
  if (mode === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              初期設定
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              お薬サポートを始めましょう
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setMode("create")}
              className="w-full h-auto py-6 flex flex-col items-center gap-2"
              variant="default"
            >
              <span className="text-lg font-semibold">
                新しいグループを作成
              </span>
              <span className="text-sm font-normal opacity-90">
                家族やケアチームのグループを作ります
              </span>
            </Button>

            <Button
              onClick={() => setMode("join")}
              className="w-full h-auto py-6 flex flex-col items-center gap-2"
              variant="outline"
            >
              <span className="text-lg font-semibold">招待コードで参加</span>
              <span className="text-sm font-normal">
                既存のグループに参加します
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 招待コードで参加モード
  if (mode === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              招待コードで参加
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              グループ管理者から受け取った招待コードを入力してください
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="invitationCode"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                招待コード
              </label>
              <Input
                id="invitationCode"
                name="invitationCode"
                type="text"
                value={invitationCode}
                onChange={(e) =>
                  setInvitationCode(e.target.value.toUpperCase())
                }
                placeholder="ABCD1234"
                maxLength={8}
                className="text-center text-lg font-mono tracking-wider"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                8文字の英数字コード
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setMode("select")}
                variant="outline"
                className="flex-1"
              >
                戻る
              </Button>
              <Button
                onClick={() => {
                  if (invitationCode.length === 8) {
                    router.push(`/invite/${invitationCode}`);
                  } else {
                    toast.error("招待コードは8文字です");
                  }
                }}
                disabled={invitationCode.length !== 8}
                className="flex-1"
              >
                次へ
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 新規グループ作成モード（既存のフォーム）
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            新しいグループを作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            グループ情報を入力してください
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-8 space-y-6"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>お名前</FormLabel>
                    <FormControl>
                      <Input placeholder="山田 太郎" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>グループ名</FormLabel>
                    <FormControl>
                      <Input placeholder="山田家" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="groupDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>グループの説明（任意）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="家族でお薬を管理するグループです"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>あなたの役割</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="patient" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            服薬する人
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="supporter" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            サポートする人
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setMode("select")}
                variant="outline"
                className="flex-1"
              >
                戻る
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="flex-1"
              >
                {form.formState.isSubmitting ? "設定中..." : "設定を完了する"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
