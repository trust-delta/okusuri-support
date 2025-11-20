import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 服薬リマインダーチェック（15分ごと）
crons.interval(
  "medication-reminders",
  { minutes: 15 },
  internal.notifications.scheduler.checkMedicationReminders
);

export default crons;
