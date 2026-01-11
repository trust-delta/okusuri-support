"use client";

import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AdherenceDonutChartProps {
  taken: number;
  skipped: number;
  pending: number;
}

export function AdherenceDonutChart({
  taken,
  skipped,
  pending,
}: AdherenceDonutChartProps) {
  const total = taken + skipped + pending;

  const chartData = [
    { status: "taken", count: taken, fill: "var(--color-taken)" },
    { status: "skipped", count: skipped, fill: "var(--color-skipped)" },
    { status: "pending", count: pending, fill: "var(--color-pending)" },
  ];

  const chartConfig = {
    count: {
      label: "回数",
    },
    taken: {
      label: "服用",
      color: "var(--chart-2)", // エメラルドグリーン
    },
    skipped: {
      label: "スキップ",
      color: "var(--destructive)",
    },
    pending: {
      label: "未記録",
      color: "var(--chart-4)", // イエロー
    },
  } satisfies ChartConfig;

  // データがない場合
  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">服用状況の内訳</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">データがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">服用状況の内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[220px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                      <span>
                        {chartConfig[name as keyof typeof chartConfig]?.label ||
                          name}
                      </span>
                      <span className="font-bold">{value}回</span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={50}
              outerRadius={80}
              strokeWidth={2}
              stroke="var(--background)"
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {total}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 18}
                          className="fill-muted-foreground text-xs"
                        >
                          回
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="status" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
