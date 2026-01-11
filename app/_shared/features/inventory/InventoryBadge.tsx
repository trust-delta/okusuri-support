"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InventoryBadgeProps {
  currentQuantity: number;
  unit: string;
  warningThreshold?: number;
  className?: string;
}

/**
 * 残量表示バッジ
 * 残量に応じて色分け表示
 */
export function InventoryBadge({
  currentQuantity,
  unit,
  warningThreshold,
  className,
}: InventoryBadgeProps) {
  const isLowStock =
    warningThreshold !== undefined && currentQuantity <= warningThreshold;
  const isCritical = currentQuantity === 0;

  const getVariant = () => {
    if (isCritical) return "destructive";
    if (isLowStock) return "warning";
    return "secondary";
  };

  const getLabel = () => {
    if (isCritical) return "在庫切れ";
    return `残${currentQuantity}${unit}`;
  };

  return (
    <Badge
      variant={
        getVariant() as "destructive" | "secondary" | "default" | "outline"
      }
      className={cn(
        "text-xs",
        isLowStock &&
          !isCritical &&
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        className,
      )}
    >
      {getLabel()}
    </Badge>
  );
}
