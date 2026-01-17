import { formatInTimeZone } from "date-fns-tz";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

/**
 * 通知設定の型
 */
type NotificationSettings = {
  morningTime: number;
  noonTime: number;
  eveningTime: number;
  bedtimeTime: number;
};

/**
 * タイミングごとの時刻設定キー
 */
const TIMING_SETTINGS_KEY: Record<
  "morning" | "noon" | "evening" | "bedtime",
  keyof NotificationSettings
> = {
  morning: "morningTime",
  noon: "noonTime",
  evening: "eveningTime",
  bedtime: "bedtimeTime",
};

/**
 * 服薬リマインダーをチェックして通知を送信
 *
 * 15分ごとに実行され、各グループの通知設定に基づいて
 * 現在時刻に該当する服薬スケジュールを検索し、
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
      const currentTimeInMinutes = jstHour * 60 + jstMinute;

      console.log(`[Medication Reminders] JST Time: ${jstDate} ${jstTime}`);

      // 全グループの通知設定を取得
      const groupSettings = await ctx.runQuery(
        internal.notifications.queries.getAllGroupsWithNotificationSettings,
        {},
      );

      console.log(
        `[Medication Reminders] Found ${groupSettings.length} groups with settings`,
      );

      let totalSentCount = 0;
      let totalCheckedCount = 0;
      const errors: string[] = [];

      // 各グループの設定に基づいて通知を判定
      for (const { groupId, settings } of groupSettings) {
        // 現在時刻にマッチするタイミングを判定
        const matchedTiming = determineTimingFromSettings(
          currentTimeInMinutes,
          settings,
        );

        if (!matchedTiming) {
          continue;
        }

        console.log(
          `[Medication Reminders] Group ${groupId}: timing=${matchedTiming}`,
        );

        // 該当する服薬記録を検索
        const pendingRecords = await ctx.runQuery(
          internal.notifications.queries.getPendingRecordsByTiming,
          {
            date: jstDate,
            timing: matchedTiming,
          },
        );

        // このグループの記録のみフィルタ
        const groupRecords = pendingRecords.filter(
          (r) => r.groupId === groupId,
        );
        totalCheckedCount += groupRecords.length;

        // 各記録について通知を送信
        for (const record of groupRecords) {
          try {
            const payload = createNotificationPayload(record, matchedTiming);
            const result = await ctx.runAction(api.push.actions.sendToGroup, {
              groupId: groupId as Id<"groups">,
              payload,
            });

            if (result.isSuccess) {
              totalSentCount += result.data.sent || 0;
            } else {
              errors.push(`Group ${groupId}: ${result.errorMessage}`);
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
      }

      console.log(
        `[Medication Reminders] Sent ${totalSentCount} notifications`,
      );

      return {
        sent: totalSentCount,
        checked: totalCheckedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `${totalSentCount}件の通知を送信しました`,
      };
    } catch (error) {
      console.error("[Medication Reminders] Fatal error:", error);
      throw error;
    }
  },
});

/**
 * スヌーズ解除時刻を過ぎた記録の再通知
 *
 * 5分ごとに実行され、スヌーズ解除時刻を過ぎた記録に再通知を送信します。
 */
export const checkSnoozedReminders = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    sent: number;
    checked?: number;
    errors?: string[];
    message: string;
  }> => {
    console.log("[Snoozed Reminders] Checking for snoozed records...");

    try {
      // スヌーズ解除時刻を過ぎた記録を取得
      const dueRecords = await ctx.runQuery(
        internal.notifications.queries.getSnoozedRecordsDue,
        {},
      );

      console.log(`[Snoozed Reminders] Found ${dueRecords.length} due records`);

      let sentCount = 0;
      const errors: string[] = [];

      // 各記録について通知を送信
      for (const record of dueRecords) {
        try {
          const payload = createNotificationPayload(
            record,
            record.timing,
            true,
          );
          const result = await ctx.runAction(api.push.actions.sendToGroup, {
            groupId: record.groupId as Id<"groups">,
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
          console.error("[Snoozed Reminders] Error processing record:", error);
        }
      }

      console.log(`[Snoozed Reminders] Sent ${sentCount} notifications`);

      return {
        sent: sentCount,
        checked: dueRecords.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `${sentCount}件のスヌーズ再通知を送信しました`,
      };
    } catch (error) {
      console.error("[Snoozed Reminders] Fatal error:", error);
      throw error;
    }
  },
});

/**
 * グループの通知設定に基づいてタイミングを判定
 *
 * @param currentTimeInMinutes 現在時刻（分単位）
 * @param settings グループの通知設定
 * @returns タイミング文字列、または該当なしの場合null
 */
function determineTimingFromSettings(
  currentTimeInMinutes: number,
  settings: NotificationSettings,
): "morning" | "noon" | "evening" | "bedtime" | null {
  const timings: Array<"morning" | "noon" | "evening" | "bedtime"> = [
    "morning",
    "noon",
    "evening",
    "bedtime",
  ];

  for (const timing of timings) {
    const settingKey = TIMING_SETTINGS_KEY[timing];
    const targetMinutes = settings[settingKey];
    const diff = Math.abs(targetMinutes - currentTimeInMinutes);

    // 15分以内ならマッチ
    if (diff <= 15) {
      return timing;
    }
  }

  return null;
}

/**
 * 通知ペイロードを作成
 *
 * @param record 服薬記録
 * @param timing タイミング
 * @param isSnoozeReminder スヌーズ再通知かどうか
 * @returns 通知ペイロード
 */
function createNotificationPayload(
  record: {
    _id: string;
    medicineName: string;
    dosage?: { amount: number; unit: string };
    groupId: string;
    snoozeCount?: number;
  },
  timing: string,
  isSnoozeReminder = false,
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
    isSnoozeReminder: boolean;
  };
  actions?: Array<{ action: string; title: string }>;
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

  // スヌーズ再通知の場合はタイトルを変更
  const title = isSnoozeReminder
    ? "服薬リマインダー（再通知）"
    : "服薬リマインダー";

  // スヌーズ回数に基づいてアクションを設定
  const snoozeCount = record.snoozeCount ?? 0;
  const MAX_SNOOZE_COUNT = 3;
  const canSnooze = snoozeCount < MAX_SNOOZE_COUNT;

  // 通知アクションボタン
  const actions: Array<{ action: string; title: string }> = [
    { action: "taken", title: "服用済み" },
  ];

  if (canSnooze) {
    actions.push({ action: "snooze", title: "後で（10分）" });
  }

  return {
    title,
    body: `${record.medicineName}${dosageText}（${timingLabel}）`,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: `medication-reminder-${record._id}`,
    data: {
      url: "/",
      recordId: record._id,
      timing,
      isSnoozeReminder,
    },
    actions,
  };
}
