import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    auth0Id: v.string(),
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_auth0Id", ["auth0Id"]),

  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("patient"), v.literal("supporter")),
    joinedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_groupId", ["groupId"]),
});
