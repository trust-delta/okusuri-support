# プライバシーチェック（医療アプリ向け）

医療情報を扱うアプリケーション特有のプライバシー要件をチェックします。

## 重要性

医療アプリは以下の理由でプライバシーに特に注意が必要です：
- 個人の健康情報（PHI: Protected Health Information）を扱う
- 服薬情報は機微性の高い個人情報
- 漏洩時の影響が大きい

---

## チェック項目

### 1. エラー監視のプライバシー設定

#### チェック内容
- Sentry などでPII（個人識別情報）が送信されていないか
- テキストマスキングが有効か
- セッションリプレイで機密情報が記録されていないか

#### 推奨設定
```typescript
// sentry.client.config.ts
Sentry.init({
  // PII を送信しない
  sendDefaultPii: false,

  integrations: [
    Sentry.replayIntegration({
      // 全てのテキストをマスク
      maskAllText: true,
      // メディアをブロック
      blockAllMedia: true,
    }),
  ],
});
```

#### 検証コマンド
```bash
Grep: pattern="sendDefaultPii|maskAllText|blockAllMedia" path="sentry.*.config.ts"
```

---

### 2. ログ出力

#### チェック内容
- 医療情報がログに出力されていないか
- ユーザー識別情報がログに含まれていないか

#### 検出パターン
```typescript
// ❌ Bad
console.log("処方箋:", prescription);
logger.info({ userId, medications });

// ✅ Good
logger.info("処方箋を取得", { prescriptionId: prescription.id });
logger.info({ userId: "[REDACTED]", medicationCount: medications.length });
```

#### 検証コマンド
```bash
Grep: pattern="console\.(log|info|debug).*prescription|medication|symptom" -i
```

---

### 3. クライアントサイドストレージ

#### チェック内容
- localStorage/sessionStorage に機密情報を保存していないか
- Cookie の設定が適切か

#### 検出パターン
```typescript
// ❌ Bad
localStorage.setItem("medications", JSON.stringify(userMedications));

// ✅ Good
// 機密情報はサーバーサイドで管理
// 必要な場合は暗号化して保存
```

#### 検証コマンド
```bash
Grep: pattern="localStorage|sessionStorage"
```

---

### 4. API レスポンス

#### チェック内容
- 不要な個人情報がレスポンスに含まれていないか
- 最小限の情報のみ返しているか

#### 検出パターン
```typescript
// ❌ Bad
return {
  ...user,
  medications: user.medications,
  healthHistory: user.healthHistory,
};

// ✅ Good
return {
  id: user.id,
  displayName: user.displayName,
  // 必要な情報のみ
};
```

---

### 5. データ表示のマスキング

#### チェック内容
- センシティブな情報の表示時にマスキングオプションがあるか
- スクリーンショット・画面共有時の配慮があるか

#### 推奨実装
```tsx
// マスキング可能なコンポーネント
<MedicationName
  name={medication.name}
  masked={privacyMode}
/>
```

---

### 6. アクセス制御

#### チェック内容
- 他人の医療情報にアクセスできないか
- グループ内でも適切なアクセス制限があるか

#### 検証ポイント
- 処方箋は所有者とグループメンバーのみアクセス可能
- 服薬記録は個人のみアクセス可能
- 統計情報は匿名化されているか

---

## チェックリスト

### エラー監視
- [ ] `sendDefaultPii: false` が設定されている
- [ ] `maskAllText: true` が設定されている
- [ ] `blockAllMedia: true` が設定されている

### ログ
- [ ] 医療情報がログに出力されていない
- [ ] ユーザーIDのみ出力（詳細情報は除外）

### ストレージ
- [ ] 機密情報がクライアントサイドに保存されていない
- [ ] Cookie は `httpOnly`, `secure`, `sameSite` が設定されている

### アクセス制御
- [ ] 他ユーザーのデータにアクセスできない
- [ ] API で所有権チェックが行われている

---

## 出力フォーマット

```markdown
## プライバシーチェック結果

### ステータス: ✅ 問題なし / ⚠️ 要確認 / ❌ 問題あり

### エラー監視
- [x] PII 送信無効化
- [x] テキストマスキング有効
- [x] メディアブロック有効

### ログ出力
- [ ] 要確認: src/features/prescription/actions.ts:45

### アクセス制御
- [x] 所有権チェック実装済み

### 推奨アクション
1. ログ出力から処方箋詳細を除外
```

---

**最終更新**: 2025年11月30日
