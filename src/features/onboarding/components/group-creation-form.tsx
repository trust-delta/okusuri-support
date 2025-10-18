"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthPageLayout } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Textarea } from "@/shared/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";

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

interface GroupCreationFormProps {
  onBack: () => void;
}

export function GroupCreationForm({ onBack }: GroupCreationFormProps) {
  const router = useRouter();
  const completeOnboarding = useMutation(
    api.groups.completeOnboardingWithNewGroup,
  );

  const form = useForm<CreateGroupFormSchema>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      userName: "",
      groupName: "",
      groupDescription: "",
      role: "patient",
    },
  });

  const handleSubmit = async (data: CreateGroupFormSchema) => {
    try {
      await completeOnboarding({
        userName: data.userName,
        groupName: data.groupName,
        groupDescription: data.groupDescription,
        role: data.role,
      });

      toast.success("グループを作成しました");
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました",
      );
    }
  };

  return (
    <AuthPageLayout
      title="新しいグループを作成"
      description="グループ情報を入力してください"
    >
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
                          サポーター（介護者・家族）
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onBack}>
              戻る
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex-1"
            >
              {form.formState.isSubmitting ? "作成中..." : "グループを作成"}
            </Button>
          </div>
        </form>
      </Form>
    </AuthPageLayout>
  );
}
