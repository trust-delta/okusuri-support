# スヌーズ機能仕様

**最終更新**: 2026年01月21日

## 概要

服薬リマインダーをスヌーズ（後で通知）する機能。指定時間後に再通知を行う。

---

## 目的

1. **柔軟な対応**: 今すぐ服薬できない場合に後で通知
2. **服薬忘れ防止**: 再通知により服薬漏れを軽減
3. **制限付き**: 無限スヌーズを防ぐため回数制限あり

---

## 機能仕様

### スヌーズ設定

**選択可能な時間**:
- 5分後
- 10分後
- 15分後
- 30分後

**最大回数**: 3回（デフォルト）

### スヌーズの流れ

```text
1. 服薬リマインダー通知
2. ユーザーが「後で」をタップ
3. スヌーズ時間を選択（5/10/15/30分）
4. 指定時間後に再通知
5. 服薬完了 or 再スヌーズ（上限まで）
```

---

## データモデル

### medicationRecords テーブル拡張

```typescript
{
  // 既存フィールド...
  snoozedUntil?: number,    // スヌーズ解除予定時刻
  snoozeCount?: number,     // スヌーズ回数（0〜maxSnoozeCount）
}
```

---

## API

### snoozeRecord mutation

```typescript
{
  args: {
    recordId: v.id("medicationRecords"),
    minutes: v.union(v.literal(5), v.literal(10), v.literal(15), v.literal(30)),
  },
  returns: Result<void>
}
```

### cancelSnooze mutation

```typescript
{
  args: {
    recordId: v.id("medicationRecords"),
  },
  returns: Result<void>
}
```

### checkSnoozedReminders cron

スヌーズ解除時刻を過ぎたレコードを検出し、プッシュ通知を再送信する。

**実行間隔**: 1分ごと

---

## UI実装

### コンポーネント

- `app/(private)/dashboard/_components/SnoozeButton.tsx`
  - スヌーズボタン
  - 残りスヌーズ回数表示
  - スヌーズ中のカウントダウン表示
  - スヌーズ解除ボタン

---

## 制限事項

- 最大スヌーズ回数: 3回
- スヌーズ可能な状態: `status: "pending"` のみ
- 服薬完了後はスヌーズ不可

---

## 関連ドキュメント

- [服薬管理](medication.md)
- [プッシュ通知](push-notifications.md)
