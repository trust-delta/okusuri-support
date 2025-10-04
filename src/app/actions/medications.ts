"use server";

import { auth0 } from "@/lib/auth0";

export async function recordMedication(formData: {
  groupId: string;
  timing: string;
  scheduledDate: string;
  simpleMedicineName?: string;
  status: "taken" | "skipped";
  notes?: string;
}) {
  try {
    console.log("Server Action: recordMedication called", formData);

    // Auth0トークンを取得
    console.log("Getting Auth0 access token...");
    const { token: accessToken } = await auth0.getAccessToken();
    console.log("Access token obtained:", accessToken ? "✓" : "✗");
    
    // トークンの最初の50文字をログ出力（デバッグ用）
    if (accessToken) {
      console.log("Token preview:", accessToken.substring(0, 50) + "...");
      // トークンをデコードしてペイロードを確認
      try {
        const parts = accessToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          console.log("Token payload:", JSON.stringify(payload, null, 2));
        }
      } catch (e) {
        console.error("Token decode error:", e);
      }
    }

    if (!accessToken) {
      return { error: "認証トークンが取得できませんでした" };
    }

    // Convex HTTP Actionsを呼び出し
    // HTTP ActionsはConvex Siteを使用 (.convex.site)
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(
      ".convex.cloud",
      ".convex.site",
    ) + "/medications/record";
    console.log("Calling Convex HTTP Action:", convexUrl);
    const response = await fetch(
      convexUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Convex HTTP Action error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      return { error: errorData.error || "サーバーエラーが発生しました" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Server Action error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      error:
        error instanceof Error ? error.message : "サーバーエラーが発生しました",
    };
  }
}
