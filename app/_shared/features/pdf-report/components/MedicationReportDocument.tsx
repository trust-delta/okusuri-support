import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// 日本語フォントを登録（M PLUS 1 - ローカルファイル）
// フォントファイルは public/fonts/ に配置
// ダウンロード: node scripts/download-fonts.mjs
Font.register({
  family: "MPLUS1",
  src: "/fonts/MPLUSRounded1c-Regular.ttf",
});

// スタイル定義（A4サイズにコンパクトに収まるよう調整）
const styles = StyleSheet.create({
  page: {
    fontFamily: "MPLUS1",
    padding: 25,
    fontSize: 8,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 12,
    borderBottom: "1.5 solid #2563eb",
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    color: "#64748b",
  },
  groupName: {
    fontSize: 9,
    color: "#334155",
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 6,
    backgroundColor: "#f1f5f9",
    padding: 5,
    borderRadius: 3,
  },
  summaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryCard: {
    width: "48%",
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    border: "0.5 solid #e2e8f0",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#64748b",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1e293b",
  },
  summarySubValue: {
    fontSize: 7,
    color: "#94a3b8",
  },
  adherenceRate: {
    fontSize: 18,
    fontWeight: 700,
    color: "#16a34a",
  },
  table: {
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 2,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 700,
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    padding: 4,
    borderBottom: "0.5 solid #e2e8f0",
  },
  tableCell: {
    fontSize: 7,
    color: "#334155",
  },
  colName: {
    width: "35%",
  },
  colDosage: {
    width: "20%",
  },
  colCount: {
    width: "25%",
  },
  colRate: {
    width: "20%",
    textAlign: "right",
  },
  timingRow: {
    flexDirection: "row",
    padding: 4,
    borderBottom: "0.5 solid #e2e8f0",
    alignItems: "center",
  },
  timingLabel: {
    width: "20%",
    fontSize: 8,
    color: "#334155",
  },
  timingBar: {
    width: "60%",
    flexDirection: "row",
    alignItems: "center",
  },
  timingRate: {
    width: "20%",
    fontSize: 8,
    fontWeight: 700,
    textAlign: "right",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    flex: 1,
    marginRight: 6,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#22c55e",
    borderRadius: 3,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 25,
    right: 25,
    fontSize: 6,
    color: "#94a3b8",
    textAlign: "center",
    borderTop: "0.5 solid #e2e8f0",
    paddingTop: 6,
  },
  noData: {
    padding: 12,
    textAlign: "center",
    color: "#64748b",
    fontSize: 9,
  },
});

// 型定義
interface MedicineStats {
  medicineName: string;
  totalAmount: number;
  unit: string;
  totalDoses: number;
  takenCount: number;
  skippedCount: number;
  pendingCount: number;
  adherenceRate: number;
}

interface TimingStats {
  timing: string;
  totalDoses: number;
  taken: number;
  skipped: number;
  pending: number;
  adherenceRate: number;
}

interface ReportData {
  groupName: string;
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: {
    totalMedicines: number;
    totalDoses: number;
    totalTaken: number;
    totalSkipped: number;
    totalPending: number;
    overallAdherenceRate: number;
  };
  medicines: MedicineStats[];
  timingStats: Record<string, TimingStats>;
  asNeeded: {
    taken: number;
    skipped: number;
    pending: number;
    total: number;
  };
  generatedAt: string;
}

interface MedicationReportDocumentProps {
  data: ReportData;
}

// タイミング名の日本語変換
const timingLabels: Record<string, string> = {
  morning: "朝",
  noon: "昼",
  evening: "夕",
  bedtime: "就寝前",
};

export function MedicationReportDocument({
  data,
}: MedicationReportDocumentProps) {
  const { groupName, period, summary, medicines, timingStats, asNeeded } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>服薬レポート</Text>
          <Text style={styles.subtitle}>
            {period.startDate} 〜 {period.endDate}（{period.days}日間）
          </Text>
          <Text style={styles.groupName}>{groupName}</Text>
        </View>

        {/* サマリーセクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>統計サマリー</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>服薬継続率</Text>
              <Text style={styles.adherenceRate}>
                {summary.overallAdherenceRate.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>薬の種類</Text>
              <Text style={styles.summaryValue}>{summary.totalMedicines}</Text>
              <Text style={styles.summarySubValue}>種類</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>服用回数</Text>
              <Text style={styles.summaryValue}>
                {summary.totalTaken}{" "}
                <Text style={styles.summarySubValue}>
                  / {summary.totalDoses}回
                </Text>
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>スキップ / 未記録</Text>
              <Text style={styles.summaryValue}>
                {summary.totalSkipped} / {summary.totalPending}
              </Text>
              <Text style={styles.summarySubValue}>回</Text>
            </View>
          </View>
        </View>

        {/* タイミング別統計 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>時間帯別の服薬率</Text>
          {Object.entries(timingStats).map(([timing, stats]) => {
            const label = timingLabels[timing] || timing;
            return (
              <View key={timing} style={styles.timingRow}>
                <Text style={styles.timingLabel}>{label}</Text>
                <View style={styles.timingBar}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(stats.adherenceRate, 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.timingRate}>
                  {stats.adherenceRate.toFixed(0)}%
                </Text>
              </View>
            );
          })}
          {asNeeded.total > 0 && (
            <View style={styles.timingRow}>
              <Text style={styles.timingLabel}>頓服（参考）</Text>
              <View style={styles.timingBar}>
                <Text style={{ fontSize: 9, color: "#64748b" }}>
                  服用: {asNeeded.taken}回 / スキップ: {asNeeded.skipped}回
                </Text>
              </View>
              <Text style={styles.timingRate}>-</Text>
            </View>
          )}
        </View>

        {/* 薬別統計 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>薬別の統計</Text>
          {medicines.length === 0 ? (
            <Text style={styles.noData}>この期間には服薬記録がありません</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colName]}>
                  薬名
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colDosage]}>
                  合計用量
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colCount]}>
                  服用 / 予定
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colRate]}>
                  服薬率
                </Text>
              </View>
              {medicines.map((medicine) => (
                <View key={medicine.medicineName} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colName]}>
                    {medicine.medicineName}
                  </Text>
                  <Text style={[styles.tableCell, styles.colDosage]}>
                    {medicine.totalAmount > 0
                      ? `${medicine.totalAmount}${medicine.unit}`
                      : "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCount]}>
                    {medicine.takenCount} / {medicine.totalDoses}回
                  </Text>
                  <Text style={[styles.tableCell, styles.colRate]}>
                    {medicine.adherenceRate.toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text>
            このレポートは「おくすりサポート」により生成されました •{" "}
            {data.generatedAt}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export type { ReportData, MedicineStats, TimingStats };
