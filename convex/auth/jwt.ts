import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`),
);

export interface Auth0TokenPayload {
  sub: string; // auth0Id
  email?: string;
  email_verified?: boolean;
  iat: number;
  exp: number;
  aud: string | string[];
  iss: string;
}

/**
 * Auth0のJWTトークンを検証し、ペイロードを返す
 */
export async function verifyAuth0Token(
  token: string,
): Promise<Auth0TokenPayload> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    audience: process.env.AUTH0_AUDIENCE,
  });
  return payload as Auth0TokenPayload;
}

/**
 * AuthorizationヘッダーからBearerトークンを抽出
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
