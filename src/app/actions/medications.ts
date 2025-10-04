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
    const { token: accessToken } = await auth0.getAccessToken();

    if (!accessToken) {
      return { error: "認証トークンが取得できませんでした" };
    }

    // Convex HTTP Actionsを呼び出し
    // HTTP ActionsはConvex Siteを使用 (.convex.site)
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(
      ".convex.cloud",
      ".convex.site",
    ) + "/medications/record";
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
      return { error: errorData.error || "サーバーエラーが発生しました" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "サーバーエラーが発生しました",
    };
  }
}
