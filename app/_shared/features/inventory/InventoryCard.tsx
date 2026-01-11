"use client";

import { AlertTriangle, Package, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Id } from "@/schema";
import { ConsumptionRecordDialog } from "./ConsumptionRecordDialog";

interface InventoryItem {
  _id: Id<"medicineInventory">;
  medicineId: Id<"medicines">;
  currentQuantity: number;
  unit: string;
  warningThreshold?: number;
  isTrackingEnabled: boolean;
  medicineName: string;
  isLowStock?: boolean;
}

interface InventoryCardProps {
  inventories: InventoryItem[];
  onSetupInventory?: (medicineId: Id<"medicines">) => void;
}

/**
 * 在庫一覧カード
 * グループ内の薬の残量を一覧表示
 */
export function InventoryCard({
  inventories,
  onSetupInventory: _onSetupInventory,
}: InventoryCardProps) {
  const trackingInventories = inventories.filter(
    (inv) => inv.isTrackingEnabled,
  );
  const lowStockCount = trackingInventories.filter(
    (inv) => inv.isLowStock,
  ).length;

  if (trackingInventories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            残量管理
          </CardTitle>
          <CardDescription>
            薬の残量を追跡して、不足を防ぎましょう
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>残量追跡が設定されている薬はありません</p>
            <p className="text-sm mt-1">薬の設定から残量追跡を有効にできます</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              残量管理
              {lowStockCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {lowStockCount}件の警告
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {trackingInventories.length}種類の薬を追跡中
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {trackingInventories.map((inventory) => (
          <InventoryItemRow key={inventory._id} inventory={inventory} />
        ))}
      </CardContent>
    </Card>
  );
}

interface InventoryItemRowProps {
  inventory: InventoryItem;
}

function InventoryItemRow({ inventory }: InventoryItemRowProps) {
  const { currentQuantity, unit, warningThreshold, medicineName, isLowStock } =
    inventory;

  // 警告閾値がある場合のプログレス計算（閾値の3倍を100%とする）
  const maxForProgress = warningThreshold ? warningThreshold * 3 : 100;
  const progressValue = Math.min(100, (currentQuantity / maxForProgress) * 100);

  const getProgressColor = () => {
    if (currentQuantity === 0) return "bg-red-500";
    if (isLowStock) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{medicineName}</span>
          {isLowStock && (
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {currentQuantity}
            {unit}
            {warningThreshold && (
              <span className="text-xs">
                {" "}
                / 警告: {warningThreshold}
                {unit}以下
              </span>
            )}
          </span>
        </div>
      </div>
      <ConsumptionRecordDialog
        inventoryId={inventory._id}
        medicineName={medicineName}
        currentQuantity={currentQuantity}
        unit={unit}
        trigger={
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}
