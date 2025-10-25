# 服薬記録履歴閲覧機能仕様

**最終更新**: 2025年10月24日

## 概要

グループメンバーが過去の服薬記録を月別カレンダー形式で閲覧・確認できる機能を提供します。日別の服薬状況をビジュアルに表示し、詳細な記録内容や統計情報を確認できます。

---

## ユースケース

### 主要シナリオ

**シナリオ1: 服薬者が自分の記録を振り返る**
1. ダッシュボードから「記録履歴」ページに遷移
2. 月別カレンダーで日々の服薬状況を確認
3. 特定の日付をクリックして詳細を表示
4. 服薬時刻やメモを確認

**シナリオ2: サポーターが患者の服薬状況を確認**
1. 記録履歴ページに遷移
2. 患者選択ドロップダウンから確認したい患者を選択
3. 月別の服薬継続率を確認
4. カレンダーで気になる日の詳細を確認

**シナリオ3: 前月のデータを確認**
1. 記録履歴ページを開く
2. 「前月」ボタンをクリック
3. 前月のカレンダーと統計が表示される

---

## 機能要件

### カレンダー表示

#### 月別カレンダービュー
- **説明**: 1ヶ月分の服薬記録をカレンダー形式で表示
- **優先度**: 高
- **実装状況**: 未実装
- **表示内容**:
  - 各日の服用率を色分け表示
    - 🟢 緑: 100%服用（全てのタイミングで服用）
    - 🟡 黄: 一部服用（一部のタイミングで服用）
    - 🔴 赤: 未服用（全てスキップまたは未服用）
    - ⚪ グレー: 記録なし
  - 日付表示（1-31）

#### 月の切り替え
- **説明**: 前月・次月ボタンで表示月を変更
- **優先度**: 高
- **実装状況**: 未実装

#### 日付選択
- **説明**: カレンダーの日付をクリックして詳細を表示
- **優先度**: 高
- **実装状況**: 未実装

### 日別詳細表示

#### 服薬記録詳細
- **説明**: 選択した日の全ての服薬記録を表示
- **優先度**: 高
- **実装状況**: 未実装
- **表示項目**:
  - タイミング（朝・昼・晩・就寝前・頓服）
  - ステータス（服用済み・スキップ・未服用）
  - 服薬時刻（takenAt）
  - メモ（notes）
  - 記録者（recordedBy）

### 統計情報

#### 月別統計カード
- **説明**: 選択月の服薬統計を表示
- **優先度**: 高
- **実装状況**: 未実装
- **表示項目**:
  - 服薬継続率（%）
  - 総服薬予定回数
  - 服用回数
  - スキップ回数
  - タイミング別服用率

### フィルター機能

#### 患者選択
- **説明**: サポーターが複数の患者から閲覧対象を選択
- **優先度**: 中
- **実装状況**: 未実装
- **権限**:
  - 服薬者: 自分の記録のみ表示（選択不要）
  - サポーター: グループ内の全患者から選択可能

---

## データモデル

### 使用する既存テーブル

#### `medicationRecords`（服薬記録）
既存のテーブルを参照。詳細は [medication.md](./medication.md) を参照。

**この機能で使用するフィールド**:
```typescript
{
  _id: Id<"medicationRecords">,
  groupId: Id<"groups">,
  patientId: string,
  timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded",
  scheduledDate: string,          // YYYY-MM-DD形式
  takenAt?: number,               // 服用時刻
  status: "pending" | "taken" | "skipped",
  recordedBy: string,
  notes?: string,
}
```

**使用するインデックス**:
- `by_groupId_scheduledDate`: 特定グループの特定月の記録取得
- `by_patientId_scheduledDate`: 特定患者の特定月の記録取得

---

## ビジネスルール

### 服用率の計算

1. **日別服用率**:
   ```typescript
   dailyRate = (takenCount / (takenCount + skippedCount)) * 100
   ```
   - `pending`ステータスは計算から除外
   - 記録が存在しない日は「記録なし」として表示

2. **月別服用率**:
   ```typescript
   monthlyRate = (totalTaken / (totalTaken + totalSkipped)) * 100
   ```

3. **色分けルール**:
   - 100%: 緑（全てのタイミングで服用）
   - 1-99%: 黄（一部のタイミングで服用）
   - 0%: 赤（全てスキップ）
   - 記録なし: グレー

### 表示範囲の制限

1. **過去の記録**: 制限なし（全期間表示可能）
2. **未来の記録**: 表示しない（今日まで）

---

## 権限設計（RBAC）

### ロール定義

| ロール | 説明 | 主な権限 |
|--------|------|----------|
| patient | 服薬者 | 自分の記録のみ閲覧 |
| supporter | サポーター | グループ内全患者の記録を閲覧 |

### 権限マトリクス

| 操作 | patient | supporter | 備考 |
|------|---------|-----------|------|
| 自分の記録閲覧 | ✅ | ✅ | |
| 他の患者の記録閲覧 | ❌ | ✅ | 同一グループ内のみ |
| 統計情報表示 | ✅ | ✅ | 閲覧権限がある記録のみ |

---

## API設計

### Queries（データ取得）

#### `medications.getMonthlyRecords`（新規作成）
- **用途**: 指定月の服薬記録を全て取得
- **認証**: 必須
- **引数**:
  ```typescript
  {
    groupId: Id<"groups">,
    patientId?: string,  // 未指定時は自分の記録
    year: number,        // 例: 2025
    month: number,       // 1-12
  }
  ```
- **戻り値**:
  ```typescript
  Array<{
    _id: Id<"medicationRecords">,
    timing: Timing,
    scheduledDate: string,
    status: "pending" | "taken" | "skipped",
    takenAt?: number,
    notes?: string,
    recordedBy: string,
    medicineName?: string,
  }>
  ```

#### `medications.getMonthlyStats`（新規作成）
- **用途**: 指定月の統計情報を取得
- **認証**: 必須
- **引数**:
  ```typescript
  {
    groupId: Id<"groups">,
    patientId?: string,
    year: number,
    month: number,
  }
  ```
- **戻り値**:
  ```typescript
  {
    totalScheduled: number,
    totalTaken: number,
    totalSkipped: number,
    totalPending: number,
    adherenceRate: number,  // 0-100
    dailyStats: Record<string, {  // キー: YYYY-MM-DD
      taken: number,
      skipped: number,
      pending: number,
      rate: number,  // 0-100
    }>,
    timingStats: {
      morning: { taken: number, skipped: number, rate: number },
      noon: { taken: number, skipped: number, rate: number },
      evening: { taken: number, skipped: number, rate: number },
      bedtime: { taken: number, skipped: number, rate: number },
      asNeeded: { taken: number, skipped: number, rate: number },
    }
  }
  ```

#### 既存API: `medications.getTodayRecords`
特定日の詳細表示に使用（既に実装済み）

---

## UI/UX要件

### 画面構成

#### 記録履歴ページ
- **パス**: `/history`
- **目的**: 過去の服薬記録をカレンダー形式で閲覧
- **主要コンポーネント**:
  - `HistoryHeader`: ヘッダー（戻るボタン、タイトル）
  - `PatientSelector`: 患者選択ドロップダウン（サポーター用）
  - `MonthNavigator`: 月切り替えボタン（前月・次月）
  - `MonthlyStatsCard`: 月別統計カード
  - `CalendarView`: 月別カレンダー
  - `DailyRecordDetail`: 日別詳細モーダル/セクション

### インタラクション

1. **日付クリック**:
   - トリガー: カレンダーの日付セルをクリック
   - フィードバック: 下部に日別詳細が展開表示

2. **月の切り替え**:
   - トリガー: 前月/次月ボタンをクリック
   - フィードバック: カレンダーと統計が新しい月に更新

3. **患者選択**:
   - トリガー: ドロップダウンから患者を選択
   - フィードバック: 選択した患者の記録に表示が更新

---

## バリデーション

### フロントエンド

- 年月の妥当性チェック
- 未来の月は選択不可（今月まで）

### バックエンド

```typescript
// グループメンバーシップの確認
const membership = await ctx.db
  .query("groupMembers")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("groupId"), args.groupId))
  .first();

if (!membership) {
  throw new Error("このグループのメンバーではありません");
}

// サポーターでない場合は自分の記録のみ
if (membership.role !== "supporter" && args.patientId && args.patientId !== userId) {
  throw new Error("他のユーザーの記録を閲覧する権限がありません");
}
```

---

## エラーハンドリング

| エラータイプ | メッセージ | 発生条件 | ユーザーアクション |
|--------------|-----------|----------|-------------------|
| 認証エラー | "認証が必要です" | 未認証状態でアクセス | ログインページへ遷移 |
| 権限エラー | "他のユーザーの記録を閲覧する権限がありません" | 服薬者が他人の記録を要求 | 自分の記録のみ表示 |
| グループエラー | "このグループのメンバーではありません" | 非メンバーがアクセス | ダッシュボードへ遷移 |

---

## セキュリティ要件

### 認証
- Convex Auth による認証必須

### 認可
- グループメンバーシップの確認
- ロールベースのアクセス制御（patient/supporter）
- 服薬者は自分の記録のみアクセス可能

### データ保護
- 患者の服薬記録は機密情報として扱う
- グループ外のユーザーからアクセス不可

---

## パフォーマンス要件

- **レスポンスタイム**: < 500ms（月別データ取得）
- **データ量**: 1ヶ月あたり最大 120件（4タイミング × 30日）
- **キャッシュ戦略**: Convexのリアクティブクエリによる自動最適化

### 最適化戦略
1. インデックスを活用した効率的なクエリ（`by_groupId_scheduledDate`）
2. 必要なフィールドのみ取得
3. 統計計算はバックエンドで実行

---

## テスト要件

### ユニットテスト
- [ ] 服用率計算ロジック
- [ ] 日別統計計算ロジック
- [ ] 色分けロジック

### 統合テスト
- [ ] 月別記録取得API
- [ ] 統計情報取得API
- [ ] 権限チェック（patient/supporter）

### E2Eテスト
- [ ] カレンダー表示と月の切り替え
- [ ] 日付クリックで詳細表示
- [ ] 患者選択による表示切り替え（サポーター）

---

## 依存関係

### 内部依存
- [グループ管理](./group.md): グループメンバーシップ確認
- [服薬管理](./medication.md): 服薬記録データ
- [認証](./auth.md): ユーザー認証

### 外部依存
- **react-day-picker** または **@radix-ui/react-calendar**: カレンダーコンポーネント
- **date-fns**: 日付操作
- **date-fns-tz**: タイムゾーン処理（JST）

---

## マイルストーン

### Phase 1: MVP（未着手）
- [ ] バックエンドAPI実装（`getMonthlyRecords`, `getMonthlyStats`）
- [ ] カレンダーライブラリの選定とインストール
- [ ] `CalendarView`コンポーネント実装
- [ ] `DailyRecordDetail`コンポーネント実装
- [ ] `MonthlyStatsCard`コンポーネント実装
- [ ] 記録履歴ページ実装
- [ ] ダッシュボードからのナビゲーション追加

### Phase 2: 機能拡張（未着手）
- [ ] 週別ビュー
- [ ] タイムライン表示
- [ ] データエクスポート機能（CSV/PDF）
- [ ] グラフ表示（折れ線グラフ、円グラフ）

### Phase 3: 最適化（未着手）
- [ ] ページネーション
- [ ] 仮想スクロール
- [ ] データキャッシュ最適化

---

## 既知の課題

| 課題 | 優先度 | 対応予定 | 備考 |
|------|--------|----------|------|
| カレンダーライブラリの選定 | 高 | Phase 1 | shadcn/ui標準またはreact-day-pickerを検討 |

---

## 関連ドキュメント

- [服薬管理機能](./medication.md)
- [グループ管理機能](./group.md)
- [認証機能](./auth.md)
- [プロジェクト概要](../project.md)
- [アーキテクチャ](../architecture.md)
