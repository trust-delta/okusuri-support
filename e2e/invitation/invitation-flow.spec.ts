import { expect, test } from "@playwright/test";
import {
  generateInvitationCode,
  joinGroupWithInvitation,
} from "../helpers/invitation";

/**
 * 招待機能のE2Eテスト
 *
 * このテストスイートは、グループ招待機能の完全なフローをテストします：
 * - 招待コード生成
 * - 招待リンク共有
 * - 招待受け入れとグループ参加
 * - Patient制約の適用
 * - エラーハンドリング
 *
 * ## テスト状況
 *
 * ### 有効なテスト (2/16)
 * - ✅ 無効な招待コードでエラーが表示される
 * - ✅ 有効期限切れ招待コードでエラーメッセージが表示される
 *
 * ### スキップ中のテスト (12/16) - 認証システムの実装待ち
 * ほとんどのE2Eテストは認証（メールOTP）とテストデータのセットアップが必要です。
 * これらの機能は統合テスト (convex/invitations/__tests__/) で包括的にテストされています。
 *
 * #### 認証セットアップ後に有効化予定:
 * - 招待コード生成と共有
 * - 招待リンクからの参加
 * - フルフロー統合テスト
 * - Patient制約のUI表示
 * - エラーハンドリングUI
 * - クリップボードコピー機能
 *
 * ## 統合テストとの関係
 * E2Eテストは主にUIとブラウザの動作を確認し、
 * ビジネスロジックは統合テストで包括的にカバーしています：
 * - convex/invitations/__tests__/createInvitation.test.ts - 招待コード生成
 * - convex/invitations/__tests__/validateInvitation.test.ts - 招待コード検証
 * - convex/invitations/__tests__/joinGroupWithInvitation.test.ts - グループ参加
 * - convex/invitations/__tests__/integration.test.ts - フルフロー統合テスト
 */
test.describe("招待機能のE2Eフロー", () => {
  test.skip("招待コードを生成して共有できる", async ({ page }) => {
    // NOTE: このテストは認証システム（メールOTP）の実装が必要なためスキップ
    // 代わりに convex/invitations/__tests__/integration.test.ts で統合テストを実施
    // TODO: Playwright Auth Setup (storageState) を実装後に有効化
    // 1. ログイン
    // await signIn(page, testUser.email, testUser.password);
    // 2. グループ設定ページに移動
    // await page.goto("/settings/group");
    // 3. 招待コード生成ボタンをクリック
    // await page.click('button:has-text("招待コードを生成")');
    // 4. 招待コードが表示されることを確認
    // const invitationCode = await page.locator('[data-testid="invitation-code"]');
    // await expect(invitationCode).toBeVisible();
    // 5. クリップボードにコピーボタンが動作することを確認
    // const copyButton = page.locator('button:has-text("コピー")');
    // await copyButton.click();
    // 6. コピー成功のトーストが表示されることを確認
    // await expect(page.locator('text=コピーしました')).toBeVisible();
  });

  test.skip("招待リンクから参加できる", async ({ page, context }) => {
    // NOTE: このテストは認証システムと有効な招待コードのセットアップが必要なためスキップ
    // 代わりに convex/invitations/__tests__/joinGroupWithInvitation.test.ts で統合テストを実施
    // TODO: Playwright Auth Setup + テストデータセットアップ実装後に有効化
    // 1. 招待コードを使用して招待ページにアクセス
    // const testInvitationCode = "TEST1234";
    // await page.goto(`/invite/${testInvitationCode}`);
    // 2. グループ情報が表示されることを確認
    // await expect(page.locator("h2")).toContainText("グループへの招待");
    // 3. ロール選択
    // await page.click('input[value="supporter"]');
    // 4. 表示名を入力
    // await page.fill('input[name="displayName"]', "テストサポーター");
    // 5. 参加ボタンをクリック
    // await page.click('button:has-text("グループに参加する")');
    // 6. ダッシュボードにリダイレクトされることを確認
    // await expect(page).toHaveURL("/dashboard");
    // 7. グループメンバーとして表示されることを確認
    // await expect(page.locator("text=テストサポーター")).toBeVisible();
  });

  test("無効な招待コードでエラーが表示される", async ({ page }) => {
    // 存在しない招待コードでアクセス
    await page.goto("/invite/INVALID123");

    // エラーメッセージが表示されることを確認
    await expect(page.locator("text=招待コードが無効です")).toBeVisible();
  });

  test.describe("フルフロー統合テスト", () => {
    test.skip("招待コード生成→共有→新規ユーザー参加のフルフロー", async ({
      page,
      context,
    }) => {
      // NOTE: このテストは認証システムとマルチユーザーセットアップが必要なためスキップ
      // 代わりに convex/invitations/__tests__/integration.test.ts で統合テストを実施
      // TODO: Playwright Auth Setup + マルチセッション実装後に有効化
      // === Phase 1: グループ作成者が招待コードを生成 ===
      // const creator = await createTestUserAndSignIn(page, "supporter");
      // オンボーディングでグループを作成
      // await completeOnboarding(page, "E2Eテストグループ", "supporter");
      // グループ設定ページに移動
      // await page.goto("/settings/group");
      // 招待コード生成
      // const invitationCode = await generateInvitationCode(page);
      // expect(invitationCode).toHaveLength(8);
      // === Phase 2: 新規ユーザーが招待リンクから参加 ===
      // const newUserPage = await context.newPage();
      // await joinGroupWithInvitation(newUserPage, invitationCode, "E2E患者ユーザー", "patient");
      // === Phase 3: 参加成功の確認 ===
      // await expect(newUserPage).toHaveURL("/dashboard");
      // await expect(newUserPage.locator("text=E2Eテストグループ")).toBeVisible();
      // === Phase 4: 作成者側でメンバー追加を確認 ===
      // await page.goto("/settings/group/members");
      // await expect(page.locator("text=E2E患者ユーザー")).toBeVisible();
    });

    test.skip("招待一覧にリアルタイムで新規招待が表示される", async ({
      page,
    }) => {
      // NOTE: このテストは認証とグループセットアップが必要なためスキップ
      // TODO: Playwright Auth Setup実装後に有効化
      // グループ設定ページに移動
      // await page.goto("/settings/group");
      // 招待を生成して一覧に表示されることを確認
      // const code1 = await generateInvitationCode(page);
      // await expect(page.locator(`[data-invitation-code="${code1}"]`)).toBeVisible();
      // 2件目の招待を生成
      // const code2 = await generateInvitationCode(page);
      // await expect(page.locator(`[data-invitation-code="${code2}"]`)).toBeVisible();
    });
  });

  test.describe("Patient制約のUI表示", () => {
    test.skip("Patient存在グループでの招待生成はSupporterのみ表示", async ({
      page,
    }) => {
      // NOTE: このテストは認証とPatient存在グループのセットアップが必要なためスキップ
      // Patient制約のロジックは convex/invitations/__tests__/createInvitation.test.ts で統合テスト済み
      // TODO: テストデータセットアップ実装後に有効化
      // Patient存在グループで招待を生成
      // await page.goto("/settings/group");
      // const invitationCode = await generateInvitationCode(page);
      // 招待ページにアクセス
      // await page.goto(`/invite/${invitationCode}`);
      // Supporterロールのみ選択可能
      // await expect(page.locator('input[value="supporter"]')).toBeVisible();
      // await expect(page.locator('input[value="patient"]')).not.toBeVisible();
      // 説明メッセージが表示される
      // await expect(page.locator("text=このグループには既に患者が登録されているため")).toBeVisible();
    });

    test.skip("Patient不在グループでは両ロール選択可能", async ({ page }) => {
      // NOTE: このテストは認証とPatient不在グループのセットアップが必要なためスキップ
      // Patient制約のロジックは convex/invitations/__tests__/createInvitation.test.ts で統合テスト済み
      // TODO: テストデータセットアップ実装後に有効化
      // Patient不在グループで招待を生成
      // await page.goto("/settings/group");
      // const invitationCode = await generateInvitationCode(page);
      // 招待ページにアクセス
      // await page.goto(`/invite/${invitationCode}`);
      // 両方のロールが選択可能
      // await expect(page.locator('input[value="supporter"]')).toBeVisible();
      // await expect(page.locator('input[value="patient"]')).toBeVisible();
    });

    test.skip("グループメンバー一覧でPatientバッジが表示される", async ({
      page,
    }) => {
      // NOTE: このテストは認証とメンバー管理ページの実装が必要なためスキップ
      // TODO: メンバー一覧ページの実装 + 認証セットアップ後に有効化
      // メンバー一覧ページに移動
      // await page.goto("/settings/group/members");
      // Patientバッジが表示される
      // await expect(page.locator('[data-testid="patient-badge"]')).toBeVisible();
      // await expect(page.locator('[data-testid="patient-badge"]')).toContainText("患者");
    });
  });

  test.describe("エラーハンドリングUI", () => {
    test("有効期限切れ招待コードでエラーメッセージが表示される", async ({
      page,
    }) => {
      // 有効期限切れの招待コード（存在しないため同じエラー）
      await page.goto("/invite/EXPIRED123");

      // エラーメッセージが表示される
      await expect(page.locator("text=招待コードが無効です")).toBeVisible();

      // 「招待が無効です」タイトルが表示される
      await expect(page.locator("text=招待が無効です")).toBeVisible();
    });

    test.skip("重複参加時にエラーメッセージとリダイレクトが発生する", async ({
      page,
    }) => {
      // NOTE: このテストは認証と既参加グループのセットアップが必要なためスキップ
      // 重複参加のエラーハンドリングは convex/invitations/__tests__/joinGroupWithInvitation.test.ts で統合テスト済み
      // TODO: 認証セットアップ + テストデータ準備後に有効化
      // 既に参加しているグループの招待コードでアクセス
      // await page.goto("/invite/ALREADY_JOINED");
      // ロールを選択して参加を試行
      // await page.click('input[value="supporter"]');
      // await page.fill('input[name="displayName"]', "テストユーザー");
      // await page.click('button:has-text("グループに参加する")');
      // エラーメッセージが表示される
      // await expect(page.locator("text=既にこのグループのメンバーです")).toBeVisible();
    });

    test.skip("Patient重複エラーでロール変更ガイダンスが表示される", async ({
      page,
    }) => {
      // NOTE: このテストは認証とPatient存在グループのセットアップが必要なためスキップ
      // Patient重複のエラーハンドリングは convex/invitations/__tests__/joinGroupWithInvitation.test.ts で統合テスト済み
      // TODO: 認証セットアップ + テストデータ準備後に有効化
      // 招待ページにアクセス
      // await page.goto("/invite/PATIENT_EXISTS");
      // Patientロールを選択して参加を試行
      // await page.click('input[value="patient"]');
      // await page.fill('input[name="displayName"]', "テストユーザー");
      // await page.click('button:has-text("グループに参加する")');
      // エラーメッセージが表示される
      // await expect(page.locator("text=このグループには既に患者が登録されています")).toBeVisible();
    });

    test.skip("表示名バリデーションエラーが表示される", async ({ page }) => {
      // NOTE: このテストは有効な招待コードのセットアップが必要なためスキップ
      // バリデーションロジック自体は convex/groups.ts の joinGroupWithInvitation で実装済み
      // TODO: テストデータ準備後に有効化
      // 有効な招待コードでアクセス
      // await page.goto("/invite/VALID_CODE");
      // ロールを選択
      // await page.click('input[value="supporter"]');
      // 空の表示名で参加を試行
      // await page.click('button:has-text("グループに参加する")');
      // バリデーションエラーが表示される
      // await expect(page.locator("text=表示名を入力してください")).toBeVisible();
      // 51文字の表示名を入力
      // const longName = "あ".repeat(51);
      // await page.fill('input[name="displayName"]', longName);
      // await page.click('button:has-text("グループに参加する")');
      // 文字数制限エラーが表示される
      // await expect(page.locator("text=表示名は50文字以内で入力してください")).toBeVisible();
    });
  });

  test.describe("招待リンク共有機能", () => {
    test.skip("クリップボードコピー機能が動作する", async ({
      page,
      context,
    }) => {
      // NOTE: このテストは認証とグループセットアップが必要なためスキップ
      // TODO: 認証セットアップ実装後に有効化
      // グループ設定ページに移動
      // await page.goto("/settings/group");
      // 招待を生成
      // const invitationCode = await generateInvitationCode(page);
      // コピーボタンをクリック
      // await page.click(`[data-invitation-code="${invitationCode}"] button:has-text("コピー")`);
      // 成功トーストが表示される
      // await expect(page.locator("text=コピーしました")).toBeVisible({ timeout: 3000 });
      // クリップボードの内容を確認
      // await context.grantPermissions(["clipboard-read"]);
      // const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      // expect(clipboardText).toContain(`/invite/${invitationCode}`);
    });

    // モバイル共有機能はE2Eでのテストが困難なため、手動テストまたはモバイルエミュレータで実施
    test.skip("モバイル環境でWeb Share APIボタンが表示される", async ({
      page,
    }) => {
      // NOTE: このテストは認証とモバイルエミュレーション設定が必要なためスキップ
      // Web Share API機能は実装済み（手動テストまたは実デバイスでの確認推奨）
      // TODO: 認証セットアップ + モバイルプロジェクト設定後に有効化
      // モバイルビューポートを設定
      // await page.setViewportSize({ width: 375, height: 667 });
      // グループ設定ページに移動
      // await page.goto("/settings/group");
      // 招待を生成
      // const invitationCode = await generateInvitationCode(page);
      // 共有ボタンが表示される（Web Share API対応の場合）
      // const shareButton = page.locator(`[data-invitation-code="${invitationCode}"] button:has-text("共有")`);
      // if (await shareButton.isVisible()) {
      //   await expect(shareButton).toBeEnabled();
      // }
    });
  });
});
