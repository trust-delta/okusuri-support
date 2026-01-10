"use client";

import { useMutation } from "convex/react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  imageUrl: string | null | undefined;
  onImageUploaded: (storageId: string) => Promise<void>;
  onImageRemoved: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function ImageUpload({
  imageUrl,
  onImageUploaded,
  onImageRemoved,
  disabled = false,
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generateUploadUrl = useMutation(
    api.storage.mutations.generateUploadUrl,
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE) {
        toast.error("ファイルサイズは5MB以下にしてください");
        return;
      }

      // ファイルタイプチェック
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("JPEG、PNG、WebP形式の画像を選択してください");
        return;
      }

      // プレビュー表示
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      setIsUploading(true);

      try {
        // アップロードURLを取得
        const uploadUrl = await generateUploadUrl();

        // ファイルをアップロード
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error("アップロードに失敗しました");
        }

        const { storageId } = await response.json();

        // 親コンポーネントに通知
        await onImageUploaded(storageId);

        toast.success("画像をアップロードしました");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "画像のアップロードに失敗しました",
        );
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
        // inputをリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }

      // クリーンアップ
      return () => URL.revokeObjectURL(objectUrl);
    },
    [generateUploadUrl, onImageUploaded],
  );

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    try {
      await onImageRemoved();
      setPreviewUrl(null);
      toast.success("画像を削除しました");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error(
        error instanceof Error ? error.message : "画像の削除に失敗しました",
      );
    } finally {
      setIsRemoving(false);
    }
  }, [onImageRemoved]);

  const displayUrl = previewUrl || imageUrl;
  const isLoading = isUploading || isRemoving;

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileSelect}
        disabled={disabled || isLoading}
        className="hidden"
      />

      {displayUrl ? (
        <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="relative aspect-4/3 w-full">
            <Image
              src={displayUrl}
              alt="処方箋画像"
              fill
              className="object-contain bg-gray-50 dark:bg-gray-900"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}

          {!disabled && !isLoading && (
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemove}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className={cn(
            "w-full aspect-4/3 rounded-lg border-2 border-dashed",
            "border-gray-300 dark:border-gray-600",
            "hover:border-gray-400 dark:hover:border-gray-500",
            "bg-gray-50 dark:bg-gray-900",
            "flex flex-col items-center justify-center gap-2",
            "text-gray-500 dark:text-gray-400",
            "transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-10 w-10" />
              <span className="text-sm">クリックして画像を選択</span>
              <span className="text-xs text-gray-400">
                JPEG, PNG, WebP (最大5MB)
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
