/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as groups_mutations from "../groups/mutations.js";
import type * as groups_queries from "../groups/queries.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as invitation_code_generator from "../invitation_code_generator.js";
import type * as invitations_actions from "../invitations/actions.js";
import type * as invitations_mutations from "../invitations/mutations.js";
import type * as invitations_queries from "../invitations/queries.js";
import type * as invitations from "../invitations.js";
import type * as medications_alerts_index from "../medications/alerts/index.js";
import type * as medications_alerts_mutations from "../medications/alerts/mutations.js";
import type * as medications_alerts_queries from "../medications/alerts/queries.js";
import type * as medications_groups_index from "../medications/groups/index.js";
import type * as medications_groups_mutations from "../medications/groups/mutations.js";
import type * as medications_groups_queries from "../medications/groups/queries.js";
import type * as medications_history_index from "../medications/history/index.js";
import type * as medications_history_mutations from "../medications/history/mutations.js";
import type * as medications_history_queries from "../medications/history/queries.js";
import type * as medications_inventory_index from "../medications/inventory/index.js";
import type * as medications_inventory_mutations from "../medications/inventory/mutations.js";
import type * as medications_inventory_queries from "../medications/inventory/queries.js";
import type * as medications_medicines_index from "../medications/medicines/index.js";
import type * as medications_medicines_mutations from "../medications/medicines/mutations.js";
import type * as medications_medicines_queries from "../medications/medicines/queries.js";
import type * as medications_prescriptions_helpers from "../medications/prescriptions/helpers.js";
import type * as medications_prescriptions_mutations from "../medications/prescriptions/mutations.js";
import type * as medications_prescriptions_queries from "../medications/prescriptions/queries.js";
import type * as medications_records_index from "../medications/records/index.js";
import type * as medications_records_mutations from "../medications/records/mutations.js";
import type * as medications_records_queries from "../medications/records/queries.js";
import type * as medications_statistics_helpers from "../medications/statistics/helpers.js";
import type * as medications_statistics_index from "../medications/statistics/index.js";
import type * as medications_statistics_queries from "../medications/statistics/queries.js";
import type * as medications from "../medications.js";
import type * as notifications_actions from "../notifications/actions.js";
import type * as notifications_index from "../notifications/index.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as push_actions from "../push/actions.js";
import type * as push_index from "../push/index.js";
import type * as push_mutations from "../push/mutations.js";
import type * as push_queries from "../push/queries.js";
import type * as resend_otp from "../resend/otp.js";
import type * as resend_password_reset from "../resend/password_reset.js";
import type * as resend from "../resend.js";
import type * as scheduler from "../scheduler.js";
import type * as storage_index from "../storage/index.js";
import type * as storage_mutations from "../storage/mutations.js";
import type * as storage_queries from "../storage/queries.js";
import type * as storage from "../storage.js";
import type * as types_result from "../types/result.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  "groups/mutations": typeof groups_mutations;
  "groups/queries": typeof groups_queries;
  groups: typeof groups;
  http: typeof http;
  invitation_code_generator: typeof invitation_code_generator;
  "invitations/actions": typeof invitations_actions;
  "invitations/mutations": typeof invitations_mutations;
  "invitations/queries": typeof invitations_queries;
  invitations: typeof invitations;
  "medications/alerts/index": typeof medications_alerts_index;
  "medications/alerts/mutations": typeof medications_alerts_mutations;
  "medications/alerts/queries": typeof medications_alerts_queries;
  "medications/groups/index": typeof medications_groups_index;
  "medications/groups/mutations": typeof medications_groups_mutations;
  "medications/groups/queries": typeof medications_groups_queries;
  "medications/history/index": typeof medications_history_index;
  "medications/history/mutations": typeof medications_history_mutations;
  "medications/history/queries": typeof medications_history_queries;
  "medications/inventory/index": typeof medications_inventory_index;
  "medications/inventory/mutations": typeof medications_inventory_mutations;
  "medications/inventory/queries": typeof medications_inventory_queries;
  "medications/medicines/index": typeof medications_medicines_index;
  "medications/medicines/mutations": typeof medications_medicines_mutations;
  "medications/medicines/queries": typeof medications_medicines_queries;
  "medications/prescriptions/helpers": typeof medications_prescriptions_helpers;
  "medications/prescriptions/mutations": typeof medications_prescriptions_mutations;
  "medications/prescriptions/queries": typeof medications_prescriptions_queries;
  "medications/records/index": typeof medications_records_index;
  "medications/records/mutations": typeof medications_records_mutations;
  "medications/records/queries": typeof medications_records_queries;
  "medications/statistics/helpers": typeof medications_statistics_helpers;
  "medications/statistics/index": typeof medications_statistics_index;
  "medications/statistics/queries": typeof medications_statistics_queries;
  medications: typeof medications;
  "notifications/actions": typeof notifications_actions;
  "notifications/index": typeof notifications_index;
  "notifications/queries": typeof notifications_queries;
  "push/actions": typeof push_actions;
  "push/index": typeof push_index;
  "push/mutations": typeof push_mutations;
  "push/queries": typeof push_queries;
  "resend/otp": typeof resend_otp;
  "resend/password_reset": typeof resend_password_reset;
  resend: typeof resend;
  scheduler: typeof scheduler;
  "storage/index": typeof storage_index;
  "storage/mutations": typeof storage_mutations;
  "storage/queries": typeof storage_queries;
  storage: typeof storage;
  "types/result": typeof types_result;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
