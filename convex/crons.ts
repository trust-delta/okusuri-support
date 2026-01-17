// @ts-nocheck
// convex-helpers/zod4 との組み合わせで型推論が複雑になるためこのファイルの型チェックをスキップ
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 服薬リマインダーチェック（15分ごと）
crons.interval(
  "medication-reminders",
  { minutes: 15 },
  internal.scheduler.checkMedicationReminders,
);

export default crons;
