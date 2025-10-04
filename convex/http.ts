import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { extractBearerToken, verifyAuth0Token } from "./auth/jwt";

const http = httpRouter();

/**
 * テスト用エンドポイント
 */
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async () => {
    console.log("Convex HTTP Action /test called");
    return new Response(
      JSON.stringify({ message: "HTTP router is working!" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }),
});

/**
 * 服薬記録APIエンドポイント
 */
http.route({
  path: "/medications/record",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("Convex HTTP Action /medications/record called");
    try {
      // JWT検証
      const authHeader = request.headers.get("authorization");
      const token = extractBearerToken(authHeader);

      if (!token) {
        return new Response(
          JSON.stringify({ error: "認証トークンが必要です" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const payload = await verifyAuth0Token(token);
      const auth0Id = payload.sub;

      // リクエストボディをパース
      const body = await request.json();
      const {
        groupId,
        timing,
        scheduledDate,
        simpleMedicineName,
        status,
        notes,
      } = body;

      // 内部mutationを呼び出し
      const recordId = await ctx.runMutation(
        internal.medications.recordSimpleMedicationInternal,
        {
          auth0Id,
          groupId: groupId as Id<"groups">,
          timing,
          scheduledDate,
          simpleMedicineName,
          status,
          notes,
        },
      );

      return new Response(JSON.stringify({ success: true, recordId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Medication record error:", error);

      if (error instanceof Error && error.message.includes("JWS")) {
        return new Response(
          JSON.stringify({ error: "無効な認証トークンです" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "サーバーエラーが発生しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    }),
});

export default http;
