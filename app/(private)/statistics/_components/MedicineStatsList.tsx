"use client";

import { useQuery } from "convex/react";
import { AlertCircle, Pill, TrendingDown } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Id } from "@/schema";
import { MedicineAdherenceChart } from "./charts/MedicineAdherenceChart";
import { MedicineGroupDialog } from "./MedicineGroupDialog";

interface MedicineStatsListProps {
  medicines: Array<{
    medicineId?: Id<"medicines">;
    medicineName: string;
    totalAmount: number;
    unit: string;
    totalDoses: number;
    takenCount: number;
    skippedCount: number;
    pendingCount: number;
    adherenceRate: number;
  }>;
  groupId: Id<"groups">;
}

export function MedicineStatsList({
  medicines,
  groupId,
}: MedicineStatsListProps) {
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState<string[]>([]);

  // 類似薬名の提案を取得
  const similarMedicines = useQuery(
    api.medications.groups.queries.findSimilarMedicineNames,
    { groupId, threshold: 0.7 },
  );

  if (medicines.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            この期間に服用した薬がありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 類似薬名の警告 */}
      {similarMedicines && similarMedicines.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>類似した薬名が検出されました</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>
              以下の薬は名前が似ています。同じ薬の場合は統合することで、より正確な統計を表示できます。
            </p>
            {similarMedicines
              .slice(0, 3)
              .map((suggestion: (typeof similarMedicines)[number]) => (
                <div
                  key={suggestion.medicineNames.join("-")}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div className="flex items-center gap-2">
                    {suggestion.medicineNames.map((name: string) => (
                      <span key={name}>
                        <Badge variant="outline">{name}</Badge>
                        {name !==
                          suggestion.medicineNames[
                            suggestion.medicineNames.length - 1
                          ] && " ≈ "}
                      </span>
                    ))}
                    <span className="text-sm text-muted-foreground">
                      (類似度: {(suggestion.similarity * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedMedicines(suggestion.medicineNames);
                      setShowGroupDialog(true);
                    }}
                  >
                    統合する
                  </Button>
                </div>
              ))}
          </AlertDescription>
        </Alert>
      )}

      {/* 薬別服用率チャート（低い順） */}
      {medicines.filter((m) => m.totalDoses > 0).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              改善が必要な薬
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              服用率が低い順に表示
            </p>
          </CardHeader>
          <CardContent>
            <MedicineAdherenceChart medicines={medicines} maxItems={5} />
          </CardContent>
        </Card>
      )}

      {/* 薬別統計 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-5 w-5" />
            薬別の詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {medicines.map((medicine, index) => (
            <div
              key={`${medicine.medicineName}-${index}`}
              className="p-4 border border-border rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {medicine.medicineName}
                  </h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    {medicine.totalAmount > 0 && (
                      <span>
                        合計用量: {medicine.totalAmount}
                        {medicine.unit}
                      </span>
                    )}
                    {medicine.totalDoses > 0 && (
                      <span>服用予定: {medicine.totalDoses}回</span>
                    )}
                    <span className="text-green-600 dark:text-green-400">
                      服用: {medicine.takenCount}回
                    </span>
                    {medicine.skippedCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        スキップ: {medicine.skippedCount}回
                      </span>
                    )}
                    {medicine.pendingCount > 0 && (
                      <span className="text-muted-foreground">
                        未記録: {medicine.pendingCount}回
                      </span>
                    )}
                  </div>
                </div>
                {medicine.totalDoses > 0 ? (
                  <Badge
                    variant={
                      medicine.adherenceRate >= 80
                        ? "default"
                        : medicine.adherenceRate >= 50
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-base px-3 py-1"
                  >
                    {medicine.adherenceRate.toFixed(1)}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-base px-3 py-1">
                    頓服
                  </Badge>
                )}
              </div>

              {medicine.totalDoses > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">服用率</span>
                    <span className="font-medium">
                      {medicine.takenCount} / {medicine.totalDoses}回
                    </span>
                  </div>
                  <Progress value={medicine.adherenceRate} className="h-2" />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  頓服のみの薬（服用率は表示されません）
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 薬名統合ダイアログ */}
      <MedicineGroupDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        groupId={groupId}
        initialMedicineNames={selectedMedicines}
      />
    </div>
  );
}
