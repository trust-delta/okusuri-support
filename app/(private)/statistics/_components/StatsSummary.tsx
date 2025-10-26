"use client";

import { Activity, CheckCircle2, Clock, Pill, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-50 dark:bg-gray-800",
    },
    {
      label: "服用率",
      value: `${summary.overallAdherenceRate.toFixed(1)}`,
      subValue: "%",
      icon: Activity,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            統計サマリー（{period.days}日間）
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {period.startDate} 〜 {period.endDate}
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-3xl font-bold">{stat.value}</p>
                      {stat.subValue && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {stat.subValue}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
