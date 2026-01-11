"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const formSchema = z.object({
  groupName: z
    .string()
    .min(1, "グループ名を入力してください")
    .max(50, "グループ名は50文字以内で入力してください"),
  groupDescription: z
    .string()
    .max(200, "説明は200文字以内で入力してください")
    .optional(),
  role: z.enum(["patient", "supporter"], {
    message: "役割を選択してください",
  }),
});

type FormSchema = z.infer<typeof formSchema>;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateGroupDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createGroup = useMutation(api.groups.createGroup);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupName: "",
      groupDescription: "",
      role: "supporter",
    },
  });

  const handleSubmit = async (values: FormSchema) => {
    setIsSubmitting(true);
    try {
      const result = await createGroup({
        name: values.groupName.trim(),
        description: values.groupDescription?.trim() || undefined,
        creatorRole: values.role,
      });

      // Result型のハンドリング
      if (!result.isSuccess) {
        toast.error(result.errorMessage);
        return;
      }

      toast.success("グループを作成しました！");
      form.reset();
      onOpenChange(false);

      // 成功時のコールバック（ページリロードなど）
      if (onSuccess) {
        onSuccess();
      } else {
        // デフォルトではページをリロードして新しいグループに切り替え
        window.location.reload();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "グループの作成に失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        data-testid="create-group-dialog"
      >
        <DialogHeader>
          <DialogTitle>新しいグループを作成</DialogTitle>
          <DialogDescription>
            新しいグループを作成して、服薬管理を始めましょう。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* グループ名 */}
            <FormField
              control={form.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>グループ名 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: 家族の服薬管理"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* グループ説明 */}
            <FormField
              control={form.control}
              name="groupDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明（任意）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="例: 両親の服薬を家族でサポートするグループです"
                      className="resize-none"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 役割選択 */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>このグループでのあなたの役割 *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                      disabled={isSubmitting}
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="patient" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            服薬者（患者）
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            自分の服薬を記録・管理します
                          </p>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="supporter" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            サポーター
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            家族や友人の服薬をサポートします
                          </p>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "作成中..." : "グループを作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
