"use client";

import { CheckCircle2, Clock, Pill, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdherenceRadialChart } from "./charts/AdherenceRadialChart";

interface StatsSummaryProps {
  summary: {
    totalMedicines: number;
    totalDoses: number;
    totalTaken: number;
    totalSkipped: number;
    totalPending: number;
    overallAdherenceRate: number;
  };
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

export function StatsSummary({ summary, period }: StatsSummaryProps) {
  const stats = [
    {
      label: "薬の種類",
      value: summary.totalMedicines,
      icon: Pill,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "服用回数",
      value: summary.totalTaken,
      subValue: `/ ${summary.totalDoses}回`,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      label: "スキップ",
      value: summary.totalSkipped,
      subValue: "回",
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
    },
    {
      label: "未記録",
      value: summary.totalPending,
      subValue: "回",
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            統計サマリー（{period.days}日間）
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {period.startDate} 〜 {period.endDate}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* ラジアルチャート */}
            <div className="flex-shrink-0">
              <AdherenceRadialChart
                adherenceRate={summary.overallAdherenceRate}
              />
            </div>
            {/* KPIカード */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={`p-2 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                      <div className="flex items-baseline gap-0.5">
                        <p className="text-lg font-bold">{stat.value}</p>
                        {stat.subValue && (
                          <p className="text-xs text-muted-foreground">
                            {stat.subValue}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
