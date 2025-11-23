import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { groupsSchema } from "./groups/schema";
import { invitationsSchema } from "./invitations/schema";
import { medicinesSchema } from "./medications/schema";
import { pushSchema } from "./push/schema";
import { usersSchema } from "./users/schema";

export default defineSchema({
  ...authTables,

  // ユーザー関連のスキーマ
  ...usersSchema,

  // グループ関連のスキーマ
  ...groupsSchema,

  // 招待関連のスキーマ
  ...invitationsSchema,

  // 薬剤・服薬記録関連のスキーマ
  ...medicinesSchema,

  // プッシュ通知関連のスキーマ
  ...pushSchema,
});
