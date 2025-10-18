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
import type * as auth from "../auth.js";
import type * as groups_index from "../groups/index.js";
import type * as groups_mutations from "../groups/mutations.js";
import type * as groups_queries from "../groups/queries.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as invitationCodeGenerator from "../invitationCodeGenerator.js";
import type * as invitations_actions from "../invitations/actions.js";
import type * as invitations_index from "../invitations/index.js";
import type * as invitations_mutations from "../invitations/mutations.js";
import type * as invitations_queries from "../invitations/queries.js";
import type * as invitations from "../invitations.js";
import type * as medications_history_index from "../medications/history/index.js";
import type * as medications_history_mutations from "../medications/history/mutations.js";
import type * as medications_history_queries from "../medications/history/queries.js";
import type * as medications_index from "../medications/index.js";
import type * as medications_records_index from "../medications/records/index.js";
import type * as medications_records_mutations from "../medications/records/mutations.js";
import type * as medications_records_queries from "../medications/records/queries.js";
import type * as medications from "../medications.js";
import type * as resend_index from "../resend/index.js";
import type * as resend_otp from "../resend/otp.js";
import type * as resend_passwordReset from "../resend/passwordReset.js";
import type * as resend from "../resend.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users from "../users.js";

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
  "groups/index": typeof groups_index;
  "groups/mutations": typeof groups_mutations;
  "groups/queries": typeof groups_queries;
  groups: typeof groups;
  http: typeof http;
  invitationCodeGenerator: typeof invitationCodeGenerator;
  "invitations/actions": typeof invitations_actions;
  "invitations/index": typeof invitations_index;
  "invitations/mutations": typeof invitations_mutations;
  "invitations/queries": typeof invitations_queries;
  invitations: typeof invitations;
  "medications/history/index": typeof medications_history_index;
  "medications/history/mutations": typeof medications_history_mutations;
  "medications/history/queries": typeof medications_history_queries;
  "medications/index": typeof medications_index;
  "medications/records/index": typeof medications_records_index;
  "medications/records/mutations": typeof medications_records_mutations;
  "medications/records/queries": typeof medications_records_queries;
  medications: typeof medications;
  "resend/index": typeof resend_index;
  "resend/otp": typeof resend_otp;
  "resend/passwordReset": typeof resend_passwordReset;
  resend: typeof resend;
  "users/mutations": typeof users_mutations;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
