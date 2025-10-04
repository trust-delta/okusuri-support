import { getAccessToken } from "@auth0/nextjs-auth0";

/**
 * Convex HTTP Actionsを呼び出すユーティリティ
 */
export async function callConvexHttp<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  // Auth0トークンを取得
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("認証トークンが取得できませんでした");
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
}
