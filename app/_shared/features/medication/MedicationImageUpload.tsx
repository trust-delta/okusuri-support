"use client";

import { useMutation, useQuery } from "convex/react";
import { Camera, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Id } from "@/schema";
import { MEDICATION_TIMINGS } from "./constants";
import type { MedicationTiming } from "./types";

interface MedicationImageUploadProps {
  groupId: Id<"groups">;
  scheduledDate: string;
  timing: MedicationTiming;
  compact?: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function MedicationImageUpload({
  groupId,
  scheduledDate,
  timing,
  compact = false,
  disabled = false,
}: MedicationImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 既存画像を取得
  const existingImage = useQuery(
    api.medications.images.queries.getMedicationImage,
    { groupId, scheduledDate, timing },
  );

  const generateUploadUrl = useMutation(
    api.storage.mutations.generateUploadUrl,
  );
  const attachImage = useMutation(
    api.medications.images.mutations.attachMedicationImage,
  );
  const removeImage = useMutation(
    api.medications.images.mutations.removeMedicationImage,
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
        toast.error("JPEG、PNG、WebP、HEIC形式の画像を選択してください");
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

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };

        // 画像を添付
        await attachImage({
          groupId,
          scheduledDate,
          timing,
          storageId,
        });

        toast.success("画像をアップロードしました");
        setDialogOpen(false);
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
    },
    [generateUploadUrl, attachImage, groupId, scheduledDate, timing],
  );

  // previewUrlのクリーンアップ
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleRemove = useCallback(async () => {
    if (!existingImage?._id) return;

    setIsRemoving(true);
    try {
      await removeImage({
        imageId: existingImage._id as Id<"medicationImages">,
      });
      setPreviewUrl(null);
      toast.success("画像を削除しました");
      setDialogOpen(false);
    } catch (error) {
      console.error("Remove error:", error);
      toast.error(
        error instanceof Error ? error.message : "画像の削除に失敗しました",
      );
    } finally {
      setIsRemoving(false);
    }
  }, [existingImage, removeImage]);

  const displayUrl = previewUrl || existingImage?.imageUrl;
  const isLoading = isUploading || isRemoving;
  const hasImage = !!displayUrl;

  const timingLabel =
    MEDICATION_TIMINGS.find((t) => t.value === timing)?.label ?? timing;

  // コンパクト表示（ボタンのみ）
  if (compact) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          disabled={disabled || isLoading}
          className="hidden"
        />

        <Button
          type="button"
          variant={hasImage ? "default" : "outline"}
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={disabled || isLoading}
          className={cn(
            "gap-1.5",
            hasImage && "bg-primary text-primary-foreground",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          <span className="sr-only md:not-sr-only">
            {hasImage ? "画像あり" : "画像"}
          </span>
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{timingLabel}の服薬画像</DialogTitle>
            </DialogHeader>
            <ImageUploadContent
              displayUrl={displayUrl}
              isLoading={isLoading}
              disabled={disabled}
              onFileSelect={() => fileInputRef.current?.click()}
              onRemove={handleRemove}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // 通常表示
  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileSelect}
        disabled={disabled || isLoading}
        className="hidden"
      />

      <ImageUploadContent
        displayUrl={displayUrl}
        isLoading={isLoading}
        disabled={disabled}
        onFileSelect={() => fileInputRef.current?.click()}
        onRemove={handleRemove}
      />
    </div>
  );
}

interface ImageUploadContentProps {
  displayUrl: string | null | undefined;
  isLoading: boolean;
  disabled: boolean;
  onFileSelect: () => void;
  onRemove: () => void;
}

function ImageUploadContent({
  displayUrl,
  isLoading,
  disabled,
  onFileSelect,
  onRemove,
}: ImageUploadContentProps) {
  if (displayUrl) {
    return (
      <div className="relative rounded-lg border border-border overflow-hidden">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={displayUrl}
            alt="服薬画像"
            fill
            className="object-contain bg-muted"
            sizes="(max-width: 768px) 100vw, 400px"
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
              onClick={onFileSelect}
              className="h-8 w-8 bg-background/90 hover:bg-background"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onFileSelect}
      disabled={disabled || isLoading}
      className={cn(
        "w-full aspect-[4/3] rounded-lg border-2 border-dashed",
        "border-border",
        "hover:border-primary/50",
        "bg-muted",
        "flex flex-col items-center justify-center gap-2",
        "text-muted-foreground",
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
          <span className="text-xs text-muted-foreground/70">
            JPEG, PNG, WebP, HEIC (最大5MB)
          </span>
        </>
      )}
    </button>
  );
}
