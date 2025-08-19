/**
 * Supabase設定管理
 * 環境変数の型安全な管理とバリデーション
 */

interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey: string
  auth: {
    cookieName: string
    cookieLifetime: number
  }
}

/**
 * 環境変数の型安全な取得
 */
function getRequiredEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue
}

/**
 * Supabase設定オブジェクト
 */
export const supabaseConfig: SupabaseConfig = {
  url: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  auth: {
    cookieName: getOptionalEnvVar('NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME', 'sb-auth-token'),
    cookieLifetime: Number.parseInt(
      getOptionalEnvVar('NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_LIFETIME', '3600'),
      10
    ),
  },
}

/**
 * 設定の有効性チェック
 */
export function validateSupabaseConfig(): void {
  const { url, anonKey, serviceRoleKey, auth } = supabaseConfig

  // URL形式チェック
  try {
    new URL(url)
  } catch {
    throw new Error(`Invalid SUPABASE_URL format: ${url}`)
  }

  // キーの長さチェック（JWT形式の基本検証）
  if (anonKey.length < 100) {
    throw new Error('SUPABASE_ANON_KEY appears to be invalid (too short)')
  }

  if (serviceRoleKey.length < 100) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)')
  }

  // Cookie設定チェック
  if (auth.cookieLifetime <= 0) {
    throw new Error('SUPABASE_AUTH_COOKIE_LIFETIME must be positive number')
  }
}

// 初期化時に設定を検証
validateSupabaseConfig()
