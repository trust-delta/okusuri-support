"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Id } from "@/schema";

interface MedicineStats {
  medicineId?: Id<"medicines">;
  medicineName: string;
  totalAmount: number;
  unit: string;
  totalDoses: number;
  takenCount: number;
  skippedCount: number;
  pendingCount: number;
  adherenceRate: number;
}

interface MedicineAdherenceChartProps {
  medicines: MedicineStats[];
  maxItems?: number;
}

export function MedicineAdherenceChart({
  medicines,
  maxItems = 5,
}: MedicineAdherenceChartProps) {
  // 頓服以外の薬を服用率でソートして上位を取得
  const chartData = medicines
    .filter((m) => m.totalDoses > 0)
    .sort((a, b) => a.adherenceRate - b.adherenceRate) // 低い順（改善が必要な薬を上に）
    .slice(0, maxItems)
    .map((medicine) => ({
      name: truncateName(medicine.medicineName, 8),
      fullName: medicine.medicineName,
      rate: medicine.adherenceRate,
      taken: medicine.takenCount,
      total: medicine.totalDoses,
      fill: getBarColor(medicine.adherenceRate),
    }));

  const chartConfig = {
    rate: {
      label: "服用率",
    },
  } satisfies ChartConfig;

  if (chartData.length === 0) {
    return null;
  }

  // 高さを動的に計算（1アイテムあたり36px + 余白）
  const chartHeight = Math.max(chartData.length * 36 + 20, 100);

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: chartHeight }}
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
      >
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          width={70}
          className="text-xs"
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
          hide
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <div className="space-y-1">
                  <div className="font-semibold">{item.payload.fullName}</div>
                  <div className="text-muted-foreground">
                    服用率:{" "}
                    <span className="font-bold text-foreground">
                      {Number(value).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.payload.taken} / {item.payload.total}回
                  </div>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {chartData.map((entry) => (
            <Cell key={entry.fullName} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function getBarColor(rate: number): string {
  if (rate >= 80) return "var(--chart-2)"; // エメラルドグリーン
  if (rate >= 50) return "var(--chart-4)"; // イエロー
  return "var(--destructive)"; // 赤
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength)}...`;
}
