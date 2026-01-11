"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { Package } from "lucide-react";
import type { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertList } from "@/features/inventory/AlertList";
import { InitializeInventoryDialog } from "@/features/inventory/InitializeInventoryDialog";
import { InventoryCard } from "@/features/inventory/InventoryCard";
import type { Id } from "@/schema";

interface InventoryPageClientProps {
  groupId: Id<"groups">;
  preloadedInventories: Preloaded<typeof api.medications.getInventoriesByGroup>;
  preloadedAlerts: Preloaded<typeof api.medications.getUnreadAlerts>;
  preloadedMedicines: Preloaded<typeof api.medications.getGroupMedicines>;
}

export function InventoryPageClient({
  groupId,
  preloadedInventories,
  preloadedAlerts: _preloadedAlerts,
  preloadedMedicines,
}: InventoryPageClientProps) {
  const inventories = usePreloadedQuery(preloadedInventories);
  const medicines = usePreloadedQuery(preloadedMedicines);

  // 残量追跡が未設定の薬を抽出
  const medicinesWithoutInventory = medicines.filter(
    (med) => !inventories.some((inv) => inv.medicineId === med._id),
  );

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              残量管理
            </h1>
            <p className="text-muted-foreground mt-1">
              薬の残量を追跡して、不足を防ぎましょう
            </p>
          </div>
        </div>

        {/* アラート */}
        <AlertList groupId={groupId} />

        {/* 在庫一覧 */}
        <InventoryCard inventories={inventories} />

        {/* 未設定の薬 */}
        {medicinesWithoutInventory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">残量追跡を設定</CardTitle>
              <CardDescription>以下の薬は残量追跡が未設定です</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {medicinesWithoutInventory.map((medicine) => (
                <div
                  key={medicine._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <span className="font-medium">{medicine.name}</span>
                    {medicine.prescriptionName && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {medicine.prescriptionName}
                      </Badge>
                    )}
                  </div>
                  <InitializeInventoryDialog
                    medicineId={medicine._id}
                    medicineName={medicine.name}
                    defaultUnit={medicine.dosageUnit ?? "錠"}
                    trigger={
                      <Button variant="outline" size="sm">
                        追跡を開始
                      </Button>
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
