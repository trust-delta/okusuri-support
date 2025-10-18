"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { api } from "@/shared/lib/convex";

// フォームスキーマの定義
const formSchema = z.object({
  displayName: z
    .string()
    .min(1, { message: "表示名を入力してください" })
    .max(50, { message: "表示名は50文字以内で入力してください" }),
  role: z.enum(["patient", "supporter"], {
    message: "役割を選択してください",
  }),
});

type FormSchema = z.infer<typeof formSchema>;

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState<string>("");

  // 現在のユーザー情報を取得
  const currentUser = useQuery(api.users.getCurrentUser);

  // フォームの初期化
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      role: "supporter",
    },
  });

  // パラメータから招待コードを取得
  useEffect(() => {
    params.then((p) => {
      setInvitationCode(p.code);
    });
  }, [params]);

  // 既存ユーザーの表示名を自動入力
  useEffect(() => {
    if (currentUser?.displayName) {
      form.setValue("displayName", currentUser.displayName);
    }
  }, [currentUser, form]);

  // 招待コードの検証とグループ情報の取得
  const invitationInfo = useQuery(
    api.invitations.validateInvitationCode,
    invitationCode ? { code: invitationCode } : "skip",
  );

  const joinGroup = useMutation(api.groups.joinGroupWithInvitation);

  const handleSubmit = async (values: FormSchema) => {
    if (!invitationCode) {
      toast.error("招待コードが見つかりません");
      return;
    }

    try {
      await joinGroup({
        invitationCode,
        role: values.role,
        displayName: currentUser?.displayName
          ? undefined
          : values.displayName.trim(),
      });

      toast.success("グループに参加しました！");
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "エラーが発生しました。もう一度お試しください。",
      );
    }
  };

  // ローディング中
  if (invitationInfo === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-1/3 mx-auto" />
          </div>
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // エラー状態（期限切れ、既に使用済み、無効なコード）
  if ("error" in invitationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              招待が無効です
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {invitationInfo.error}
            </p>
            <div className="mt-6">
              <Button onClick={() => router.push("/dashboard")}>
                ダッシュボードに戻る
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { groupName, allowedRoles, expiresAt } = invitationInfo.invitation;
  const expiryDate = new Date(expiresAt);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            グループへの招待
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            「{groupName}」に招待されています
          </p>
          <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
            有効期限: {expiryDate.toLocaleDateString("ja-JP")}{" "}
            {expiryDate.toLocaleTimeString("ja-JP")}
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-8 space-y-6"
          >
            <div className="rounded-md shadow-sm space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>表示名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="山田 太郎"
                        maxLength={50}
                        disabled={!!currentUser?.displayName}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentUser?.displayName
                        ? "現在の表示名が使用されます（変更する場合は設定ページから変更してください）"
                        : "グループ内で表示される名前です（1-50文字）"}
                    </FormDescription>
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
                        {allowedRoles.includes("patient") && (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="patient" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              服薬する人（患者）
                            </FormLabel>
                          </FormItem>
                        )}
                        {allowedRoles.includes("supporter") && (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="supporter" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              サポートする人
                            </FormLabel>
                          </FormItem>
                        )}
                      </RadioGroup>
                    </FormControl>
                    {allowedRoles.length === 1 &&
                      allowedRoles[0] === "supporter" && (
                        <FormDescription className="text-amber-600 dark:text-amber-400">
                          このグループには既に患者が登録されているため、サポーター役割でのみ参加できます。
                        </FormDescription>
                      )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full"
              >
                {form.formState.isSubmitting
                  ? "参加中..."
                  : "グループに参加する"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
