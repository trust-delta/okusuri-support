/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ResendOTP from "../ResendOTP.js";
import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as auth from "../auth.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as medicationHistory from "../medicationHistory.js";
import type * as medicationRecords from "../medicationRecords.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  auth: typeof auth;
  groups: typeof groups;
  http: typeof http;
  medicationHistory: typeof medicationHistory;
  medicationRecords: typeof medicationRecords;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
