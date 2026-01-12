"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface TimingStat {
  taken: number;
  skipped: number;
  pending: number;
  total: number;
  rate: number;
}

interface TimingBarChartProps {
  timingStats: Record<string, TimingStat>;
}

const TIMING_LABELS: Record<string, string> = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
};

export function TimingBarChart({ timingStats }: TimingBarChartProps) {
  // データを変換
  const chartData = Object.entries(timingStats)
    .filter(([, data]) => data.total > 0)
    .map(([timing, data]) => ({
      timing,
      label: TIMING_LABELS[timing] || timing,
      rate: data.rate,
      taken: data.taken,
      skipped: data.skipped,
      pending: data.pending,
      total: data.total,
      fill: getBarColor(data.rate),
    }));

  const chartConfig = {
    rate: {
      label: "服用率",
    },
    morning: {
      label: "朝",
      color: "var(--chart-1)",
    },
    noon: {
      label: "昼",
      color: "var(--chart-2)",
    },
    evening: {
      label: "晩",
      color: "var(--chart-3)",
    },
    bedtime: {
      label: "就寝前",
      color: "var(--chart-5)",
    },
  } satisfies ChartConfig;

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 16 }}
      >
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          width={50}
          className="text-sm"
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => {
                const payload = item.payload as {
                  label?: string;
                  taken?: number;
                  skipped?: number;
                  pending?: number;
                };
                return (
                  <div className="space-y-1">
                    <div className="font-semibold">{payload.label}</div>
                    <div className="text-muted-foreground">
                      服用率:{" "}
                      <span className="font-bold text-foreground">
                        {Number(value).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      服用 {payload.taken} / スキップ {payload.skipped} / 未記録{" "}
                      {payload.pending}
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}

function getBarColor(rate: number): string {
  if (rate >= 80) return "var(--chart-2)"; // エメラルドグリーン
  if (rate >= 50) return "var(--chart-4)"; // イエロー
  return "var(--destructive)"; // 赤
}
