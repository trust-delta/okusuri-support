import { formatInTimeZone } from "date-fns-tz";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

/**
 * 服薬リマインダーをチェックして通知を送信
 *
 * 15分ごとに実行され、現在時刻に該当する服薬スケジュールを検索し、
 * 該当するユーザーにプッシュ通知を送信します。
 */
export const checkMedicationReminders = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    sent: number;
    checked?: number;
    errors?: string[];
    message: string;
  }> => {
    console.log("[Medication Reminders] Checking for reminders...");

    try {
      // 現在のJST時刻を取得
      const now = new Date();
      const jstDate = formatInTimeZone(now, "Asia/Tokyo", "yyyy-MM-dd");
      const jstTime = formatInTimeZone(now, "Asia/Tokyo", "HH:mm");
      const jstHour = Number.parseInt(
        formatInTimeZone(now, "Asia/Tokyo", "HH"),
        10,
      );
      const jstMinute = Number.parseInt(
        formatInTimeZone(now, "Asia/Tokyo", "mm"),
        10,
      );

      console.log(`[Medication Reminders] JST Time: ${jstDate} ${jstTime}`);

      // 現在時刻のタイミングを判定
      const currentTiming = determineTimingFromTime(jstHour, jstMinute);

      if (!currentTiming) {
        console.log(
          "[Medication Reminders] No timing matched for current time",
        );
        return { sent: 0, message: "通知対象の時間ではありません" };
      }

      console.log(`[Medication Reminders] Current timing: ${currentTiming}`);

      // 該当する服薬記録を検索
      const pendingRecords = await ctx.runQuery(
        internal.notifications.queries.getPendingRecordsByTiming,
        {
          date: jstDate,
          timing: currentTiming,
        },
      );

      console.log(
        `[Medication Reminders] Found ${pendingRecords.length} pending records`,
      );

      let sentCount = 0;
      const errors: string[] = [];

      // 各記録について通知を送信
      for (const record of pendingRecords) {
        try {
          // 通知内容を作成
          const payload = createNotificationPayload(record, currentTiming);

          // グループに通知を送信（sendToGroupが内部的にメンバーのサブスクリプションを取得）
          const result = await ctx.runAction(api.push.actions.sendToGroup, {
            groupId: record.groupId,
            payload,
          });

          if (result.isSuccess) {
            sentCount += result.data.sent || 0;
          } else {
            errors.push(`Group ${record.groupId}: ${result.errorMessage}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push(`Record ${record._id}: ${errorMessage}`);
          console.error(
            "[Medication Reminders] Error processing record:",
            error,
          );
        }
      }

      console.log(`[Medication Reminders] Sent ${sentCount} notifications`);

      return {
        sent: sentCount,
        checked: pendingRecords.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `${sentCount}件の通知を送信しました`,
      };
    } catch (error) {
      console.error("[Medication Reminders] Fatal error:", error);
      throw error;
    }
  },
});

/**
 * 時刻からタイミングを判定
 *
 * @param hour 時（0-23）
 * @param minute 分（0-59）
 * @returns タイミング文字列、または該当なしの場合null
 */
function determineTimingFromTime(
  hour: number,
  minute: number,
): "morning" | "noon" | "evening" | "bedtime" | null {
  // 各タイミングの時刻設定（±15分の範囲でマッチ）
  const timings = [
    { timing: "morning" as const, hour: 8, minute: 0 },
    { timing: "noon" as const, hour: 12, minute: 0 },
    { timing: "evening" as const, hour: 18, minute: 0 },
    { timing: "bedtime" as const, hour: 21, minute: 0 },
  ];

  for (const config of timings) {
    const targetMinutes = config.hour * 60 + config.minute;
    const currentMinutes = hour * 60 + minute;
    const diff = Math.abs(targetMinutes - currentMinutes);

    // 15分以内ならマッチ
    if (diff <= 15) {
      return config.timing;
    }
  }

  return null;
}

/**
 * 通知ペイロードを作成
 *
 * @param record 服薬記録
 * @param timing タイミング
 * @returns 通知ペイロード
 */
function createNotificationPayload(
  record: {
    _id: string;
    medicineName: string;
    dosage?: { amount: number; unit: string };
    groupId: string;
  },
  timing: string,
): {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag: string;
  data: {
    url: string;
    recordId: string;
    timing: string;
  };
} {
  // タイミングの日本語表記
  const timingLabels: Record<string, string> = {
    morning: "朝",
    noon: "昼",
    evening: "夕",
    bedtime: "就寝前",
  };

  const timingLabel = timingLabels[timing] || timing;

  // 用量の表示
  let dosageText = "";
  if (record.dosage) {
    dosageText = ` ${record.dosage.amount}${record.dosage.unit}`;
  }

  return {
    title: "服薬リマインダー",
    body: `${record.medicineName}${dosageText}（${timingLabel}）`,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: `medication-reminder-${record._id}`,
    data: {
      url: "/", // ホーム画面に遷移
      recordId: record._id,
      timing,
    },
  };
}
