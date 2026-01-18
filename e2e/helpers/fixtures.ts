/**
 * E2Eテスト用のテストデータ定義
 *
 * Chrome DevTools MCPやPlaywrightテストで使用する固定テストアカウント情報。
 *
 * 使用方法:
 * 1. Convex Dashboard > Settings > Environment Variables で以下を設定:
 *    - TEST_ACCOUNT_EMAIL: testFixtures.user.email と同じ値
 *    - TEST_ACCOUNT_FIXED_OTP: testFixtures.user.otp と同じ値
 * 2. テストではこの固定アカウントでログイン可能
 */

/**
 * テスト用固定アカウント情報
 */
export const testFixtures = {
  /**
   * デフォルトテストユーザー
   * Chrome DevTools MCPでの動作確認に使用
   */
  user: {
    email: "test@example.com",
    password: "TestPassword123!",
    otp: "12345678",
    displayName: "テストユーザー",
  },

  /**
   * サポーター用テストユーザー
   */
  supporter: {
    email: "supporter@example.com",
    password: "TestPassword123!",
    otp: "12345678",
    displayName: "テストサポーター",
  },

  /**
   * 患者用テストユーザー
   */
  patient: {
    email: "patient@example.com",
    password: "TestPassword123!",
    otp: "12345678",
    displayName: "テスト患者",
  },
} as const;

/**
 * テストグループ情報
 */
export const testGroups = {
  default: {
    name: "テストグループ",
    description: "E2Eテスト用のグループ",
  },
} as const;

/**
 * テスト用お薬情報
 */
export const testMedications = {
  default: {
    name: "テスト薬",
    dosage: "1錠",
    frequency: "毎日",
  },
} as const;

export type TestUser = (typeof testFixtures)[keyof typeof testFixtures];
