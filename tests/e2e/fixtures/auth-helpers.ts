/**
 * E2Eテスト用認証ヘルパー
 * 認証関連の共通処理をまとめたユーティリティ
 */

import { expect, type Page } from '@playwright/test'

/**
 * テストユーザー情報の型定義
 */
export interface TestUser {
  email: string
  password: string
  displayName: string
  role: 'patient' | 'supporter'
  phoneNumber?: string
}

/**
 * テスト用ユーザー情報生成
 */
export function generateTestUser(role: 'patient' | 'supporter' = 'patient'): TestUser {
  const timestamp = Date.now()
  const rolePrefix = role === 'patient' ? 'patient' : 'supporter'
  
  return {
    email: `${rolePrefix}-${timestamp}@example.com`,
    password: 'testpass123',
    displayName: `テスト${role === 'patient' ? '患者' : '支援者'}${timestamp}`,
    role,
    phoneNumber: '090-1234-5678',
  }
}

/**
 * 複数のテストユーザーをペアで生成
 */
export function generateTestUserPair() {
  return {
    patient: generateTestUser('patient'),
    supporter: generateTestUser('supporter'),
  }
}

/**
 * フォーム要素のセレクタ定数
 */
export const SELECTORS = {
  auth: {
    // サインアップフォーム
    signup: {
      form: 'form',
      roleSelect: '#role',
      displayNameInput: '#displayName',
      emailInput: '#email',
      passwordInput: '#password',
      phoneNumberInput: '#phoneNumber',
      submitButton: 'button[type="submit"]',
      successMessage: '[data-testid="signup-success"]',
      errorMessage: '.text-red-500',
    },
    // サインインフォーム
    signin: {
      form: 'form',
      emailInput: '#email',
      passwordInput: '#password',
      submitButton: 'button[type="submit"]',
      forgotPasswordLink: 'a[href="/auth/forgot-password"]',
      errorMessage: '.bg-red-50',
      generalError: '.text-red-700',
    },
    // 共通ナビゲーション
    navigation: {
      loginLink: 'a[href="/auth/signin"]',
      signupLink: 'a[href="/auth/signup"]',
      logoutButton: '[data-testid="logout-button"]',
      profileButton: '[data-testid="profile-button"]',
    }
  },
  dashboard: {
    welcomeMessage: '[data-testid="welcome-message"]',
    userProfile: '[data-testid="user-profile"]',
    userName: '[data-testid="user-name"]',
    userRole: '[data-testid="user-role"]',
  },
  pairs: {
    // ペア管理ページ
    inviteButton: '[data-testid="create-invitation-button"]',
    invitationList: '[data-testid="invitation-list"]',
    pairList: '[data-testid="pair-list"]',
    noPairsMessage: '[data-testid="no-pairs-message"]',
  }
} as const

/**
 * ユーザーサインアップ処理
 */
export async function signUpUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/signup')
  
  // フォーム入力
  await page.selectOption(SELECTORS.auth.signup.roleSelect, user.role)
  await page.fill(SELECTORS.auth.signup.displayNameInput, user.displayName)
  await page.fill(SELECTORS.auth.signup.emailInput, user.email)
  await page.fill(SELECTORS.auth.signup.passwordInput, user.password)
  
  if (user.phoneNumber) {
    await page.fill(SELECTORS.auth.signup.phoneNumberInput, user.phoneNumber)
  }
  
  // フォーム送信
  await page.click(SELECTORS.auth.signup.submitButton)
  
  // 成功メッセージまたはメール認証画面を待機
  await expect(
    page.locator(SELECTORS.auth.signup.successMessage)
      .or(page.locator('text=メール認証'))
      .or(page.locator('text=確認メール'))
  ).toBeVisible({ timeout: 10000 })
}

/**
 * ユーザーサインイン処理
 */
export async function signInUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/signin')
  
  // フォーム入力
  await page.fill(SELECTORS.auth.signin.emailInput, email)
  await page.fill(SELECTORS.auth.signin.passwordInput, password)
  
  // フォーム送信
  await page.click(SELECTORS.auth.signin.submitButton)
  
  // ログイン成功を確認（ダッシュボードまたはホームページにリダイレクト）
  await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 })
}

/**
 * 完全な認証フロー（サインアップ→ログイン）
 */
export async function authenticateUser(page: Page, user: TestUser): Promise<void> {
  try {
    // まずサインアップを試行
    await signUpUser(page, user)
    
    // ログイン実行
    await signInUser(page, user.email, user.password)
    
  } catch (error) {
    // サインアップが失敗した場合（ユーザーが既存の場合）、ログインのみ実行
    await signInUser(page, user.email, user.password)
  }
}

/**
 * ログアウト処理
 */
export async function signOutUser(page: Page): Promise<void> {
  // ログアウトボタンをクリック
  await page.click(SELECTORS.auth.navigation.logoutButton)
  
  // ログインページまたはホームページにリダイレクトされることを確認
  await expect(page).toHaveURL(/\/auth\/signin|\//, { timeout: 5000 })
}

/**
 * 認証状態チェック
 */
export async function checkAuthenticationState(page: Page): Promise<boolean> {
  try {
    // 保護されたページにアクセスしてみる
    await page.goto('/dashboard')
    
    // ログインページにリダイレクトされない場合は認証済み
    const currentUrl = page.url()
    return !currentUrl.includes('/auth/signin')
    
  } catch {
    return false
  }
}

/**
 * ユーザー情報表示確認
 */
export async function verifyUserProfile(page: Page, expectedUser: Partial<TestUser>): Promise<void> {
  // プロフィール情報が表示される場所に移動
  const profileVisible = await page.locator(SELECTORS.dashboard.userProfile).isVisible()
  
  if (profileVisible) {
    if (expectedUser.displayName) {
      await expect(page.locator(SELECTORS.dashboard.userName))
        .toContainText(expectedUser.displayName)
    }
    
    if (expectedUser.role) {
      await expect(page.locator(SELECTORS.dashboard.userRole))
        .toContainText(expectedUser.role === 'patient' ? '患者' : '支援者')
    }
  }
}