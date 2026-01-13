import { v } from "convex/values";

/**
 * タイミング型定義（共通）
 */
export const timingValidator = v.union(
  v.literal("morning"),
  v.literal("noon"),
  v.literal("evening"),
  v.literal("bedtime"),
  v.literal("asNeeded"),
);
