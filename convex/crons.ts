import { cronJobs, makeFunctionReference } from "convex/server";

const crons = cronJobs();

// 服薬リマインダーチェック（15分ごと）
// convex-helpers/zod4との組み合わせでinternal APIの型推論が深くなりすぎるため、
// makeFunctionReferenceを使用して直接参照を作成
const checkMedicationReminders = makeFunctionReference<"action">(
  "scheduler:checkMedicationReminders",
);

crons.interval(
  "medication-reminders",
  { minutes: 15 },
  checkMedicationReminders,
);

// スヌーズ再通知チェック（5分ごと）
const checkSnoozedReminders = makeFunctionReference<"action">(
  "scheduler:checkSnoozedReminders",
);

crons.interval("snoozed-reminders", { minutes: 5 }, checkSnoozedReminders);

export default crons;
