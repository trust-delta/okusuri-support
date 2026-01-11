"use client";

import { useQuery } from "convex/react";
import { AlertTriangle, Package, XCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Id } from "@/schema";

interface LowStockAlertProps {
  groupId: Id<"groups">;
}

/**
 * 低在庫アラート
 * ダッシュボードで残量不足・在庫切れの薬を警告表示
 */
export function LowStockAlert({ groupId }: LowStockAlertProps) {
  // 処方箋継続中で在庫切れの薬（緊急）
  const outOfStockItems = useQuery(
    api.medications.getOutOfStockWithActivePrescription,
    { groupId },
  );

  // 残量警告（注意）
  const lowStockInventories = useQuery(api.medications.getLowStockInventories, {
    groupId,
  });

  // 在庫切れ以外の低在庫（在庫切れは上で表示するので除外）
  const lowStockOnly = lowStockInventories?.filter(
    (inv) => inv.currentQuantity > 0,
  );

  const hasOutOfStock = outOfStockItems && outOfStockItems.length > 0;
  const hasLowStock = lowStockOnly && lowStockOnly.length > 0;

  if (!hasOutOfStock && !hasLowStock) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 処方箋継続中の在庫切れ（緊急） */}
      {hasOutOfStock && (
        <Alert
          variant="destructive"
          className="border-red-500 bg-red-50 dark:bg-red-950/20"
        >
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-200">
            在庫切れ - 処方箋は継続中です
          </AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-300">
              {outOfStockItems.map((item) => (
                <li key={item._id}>
                  <span className="font-semibold">{item.medicineName}</span>
                  {item.prescriptionName && (
                    <span className="text-sm">
                      （処方箋: {item.prescriptionName}）
                    </span>
                  )}
                  <span className="ml-2 text-red-600 font-medium">
                    補充が必要です
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Link href={`/inventory?groupId=${groupId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Package className="h-4 w-4" />
                  補充する
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 残量警告（注意） */}
      {hasLowStock && (
        <Alert
          variant="destructive"
          className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            残量が少なくなっています
          </AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300">
              {lowStockOnly.map((inventory) => (
                <li key={inventory._id}>
                  <span className="font-medium">{inventory.medicineName}</span>:
                  残り {inventory.currentQuantity}
                  {inventory.unit}
                  {inventory.warningThreshold && (
                    <span className="text-sm">
                      （警告閾値: {inventory.warningThreshold}
                      {inventory.unit}以下）
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Link href={`/inventory?groupId=${groupId}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Package className="h-4 w-4" />
                  残量管理を確認
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
