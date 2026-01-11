"use client";

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

interface AdherenceRadialChartProps {
  adherenceRate: number;
}

export function AdherenceRadialChart({
  adherenceRate,
}: AdherenceRadialChartProps) {
  // 服用率に基づいて色を決定
  const getColor = (rate: number): string => {
    if (rate >= 80) return "var(--chart-2)"; // エメラルドグリーン（成功）
    if (rate >= 50) return "var(--chart-4)"; // イエロー（注意）
    return "var(--destructive)"; // 赤（警告）
  };

  const chartData = [
    {
      name: "服用率",
      value: adherenceRate,
      fill: getColor(adherenceRate),
    },
  ];

  const chartConfig = {
    value: {
      label: "服用率",
    },
  } satisfies ChartConfig;

  // 角度を計算（360度 * 服用率）
  const endAngle = 90 - (adherenceRate / 100) * 360;

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[200px]"
    >
      <RadialBarChart
        data={chartData}
        startAngle={90}
        endAngle={endAngle}
        innerRadius={70}
        outerRadius={100}
      >
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-muted last:fill-background"
          polarRadius={[76, 64]}
        />
        <RadialBar dataKey="value" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
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
                      className="fill-foreground text-4xl font-bold"
                    >
                      {adherenceRate.toFixed(0)}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground text-sm"
                    >
                      服用率
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  );
}
