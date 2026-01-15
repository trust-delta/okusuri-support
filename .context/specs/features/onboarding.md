# オンボーディング機能仕様

**最終更新**: 2025年10月19日

## 概要

初回ユーザー向けのセットアップフロー。ロール選択とプロフィール設定を行う。

---

## 目的

1. **ロール選択**: 患者 or 支援者の選択
2. **プロフィール設定**: 表示名の入力
3. **初期グループ作成**: 患者の場合は自動作成（オプション）

---

## フロー

### 1. オンボーディング開始判定

**条件**:
- 初回ログイン後
- `users.displayName`が未設定

**リダイレクト**: `/onboarding`

### 2. ステップ1: ロール選択

**UI**: `/onboarding`

```
┌──────────────────────────┐
│   どちらで利用しますか？   │
├──────────────────────────┤
│  ┌────────┐  ┌────────┐ │
│  │ 患者   │  │支援者  │ │
│  │として  │  │として  │ │
│  └────────┘  └────────┘ │
└──────────────────────────┘
```

**選択肢**:
- **患者**: 自分の服薬を管理
- **支援者**: 他者の服薬をサポート

### 3. ステップ2: プロフィール設定

**入力項目**:
- 表示名（必須、1-50文字）
- プロフィール画像（オプション）

**API**: `users.mutations.updateProfile`
```typescript
{
  args: {
    displayName: string,
    customImageStorageId?: Id<"_storage">,
  },
  returns: void
}
```

### 4. ステップ3: 初期セットアップ（患者のみ）

**患者の場合**:
```
1. 初期グループ自動作成（グループ名: "{displayName}の服薬管理"）
2. グループメンバーとして自動追加（role: "patient"）
3. ダッシュボードへリダイレクト
```

**支援者の場合**:
```
1. グループ未作成
2. ダッシュボードへリダイレクト（招待受諾を促す）
```

---

## データ更新

### users テーブル更新

```typescript
await ctx.db.patch(userId, {
  displayName: "入力された表示名",
  customImageStorageId: uploadedImageId, // オプション
})
```

### groups テーブル作成（患者のみ）

```typescript
const groupId = await ctx.db.insert("groups", {
  name: `${displayName}の服薬管理`,
  description: "自動作成されたグループ",
  createdBy: userId,
  createdAt: Date.now(),
})

await ctx.db.insert("groupMembers", {
  groupId,
  userId,
  role: "patient",
  joinedAt: Date.now(),
})

// アクティブグループとして設定
await ctx.db.patch(userId, {
  activeGroupId: groupId
})
```

---

## UI実装

### コンポーネント

- `src/features/onboarding/components/RoleSelection.tsx`
  - ロール選択UI
  - 患者/支援者の説明

- `src/features/onboarding/components/ProfileSetup.tsx`
  - 表示名入力フォーム
  - 画像アップロード（オプション）

- `src/features/onboarding/components/OnboardingWizard.tsx`
  - ステップ管理
  - 進捗表示

### ページ

- `src/app/onboarding/page.tsx`
  - オンボーディングメインページ
  - 未認証時はログインへリダイレクト

---

## バリデーション

### 表示名
- **必須**: true
- **最小長**: 1文字
- **最大長**: 50文字
- **形式**: 任意の文字列

### 画像
- **必須**: false
- **形式**: JPEG, PNG
- **最大サイズ**: 5MB（Convex Storage制限）

---

## エラーハンドリング

| エラー | 原因 | 対応 |
|--------|------|------|
| 表示名未入力 | 必須フィールド | "表示名を入力してください" |
| 表示名長すぎ | 50文字超過 | "50文字以内で入力してください" |
| 画像サイズ超過 | 5MB超過 | "画像は5MB以下にしてください" |
| ネットワークエラー | 通信失敗 | "もう一度お試しください" |

---

## 完了後の動作

### ダッシュボードリダイレクト

```typescript
// 患者
router.push("/dashboard") // グループが自動作成済み

// 支援者
router.push("/dashboard") // 招待受諾を促すメッセージ表示
```

### 再表示防止

`users.displayName`が設定されていれば、以降オンボーディングは表示しない。

---

## スキップ機能

**現在**: スキップ不可（必須フロー）

**将来**: スキップボタン追加を検討

---

## 制限事項

- **ロール変更**: オンボーディング後は変更不可（グループ単位で管理）
- **プロフィール再編集**: 設定画面から可能
- **初期グループ削除**: 可能（患者が削除した場合、新規作成が必要）

---

## テスト

### E2Eテスト
- 患者フロー（ロール選択→プロフィール→グループ作成）
- 支援者フロー（ロール選択→プロフィール→ダッシュボード）
- バリデーションエラー
- 画像アップロード

---

## 関連ドキュメント

- [認証機能](auth.md)
- [グループ管理](group.md)
- [アーキテクチャ](../../architecture.md)
