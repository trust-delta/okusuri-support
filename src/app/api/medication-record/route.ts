import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function POST(request: Request) {
  console.log("POST /api/medication-record called");
  try {
    // Auth0トークンを取得
    console.log("Getting access token...");
    const { token: accessToken } = await auth0.getAccessToken();
    console.log("Access token obtained:", accessToken ? "✓" : "✗");

    if (!accessToken) {
      return NextResponse.json(
        { error: "認証トークンが取得できませんでした" },
        { status: 401 },
      );
    }

    // リクエストボディを取得
    const body = await request.json();

    // Convex HTTP Actionsを呼び出し
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CONVEX_URL}/medications/record`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "サーバーエラーが発生しました" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "サーバーエラーが発生しました",
      },
      { status: 500 },
    );
  }
}
