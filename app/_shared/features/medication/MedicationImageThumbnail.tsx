"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MedicationImageThumbnailProps {
  imageUrl: string | null | undefined;
  notes?: string;
  timing?: string;
  className?: string;
}

export function MedicationImageThumbnail({
  imageUrl,
  notes,
  timing,
  className,
}: MedicationImageThumbnailProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!imageUrl) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className={cn(
          "relative flex-shrink-0 rounded-md overflow-hidden",
          "border border-border",
          "hover:ring-2 hover:ring-primary/50",
          "transition-all cursor-pointer",
          "w-12 h-12",
          className,
        )}
      >
        <Image
          src={imageUrl}
          alt={timing ? `${timing}の服薬画像` : "服薬画像"}
          fill
          className="object-cover"
          sizes="48px"
        />
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {timing ? `${timing}の服薬画像` : "服薬画像"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative aspect-4/3 w-full rounded-lg overflow-hidden border border-border">
              <Image
                src={imageUrl}
                alt={timing ? `${timing}の服薬画像` : "服薬画像"}
                fill
                className="object-contain bg-muted"
                sizes="(max-width: 768px) 100vw, 500px"
              />
            </div>

            {notes && (
              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm text-muted-foreground">{notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
