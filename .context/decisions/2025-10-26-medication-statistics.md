# ADR: 服薬統計機能の実装

**日付**: 2025年10月26日
**ステータス**: 実装完了
**決定者**: 開発者

---

## 背景

処方箋管理機能の実装により、期間ベースの服薬記録が可能になった。次のステップとして、ユーザーから以下の要望が出された：

### ユーザー要望

> 「〇〇という薬を、この期間で何mg飲んでいた」などの統計情報を出せるようになりますか？

### 現在の実装の問題点

#### 1. 用量データの構造不足

現在の `medicationSchedules.dosage` フィールド：
```typescript
dosage: v.optional(v.string()), // 例: "1錠", "2カプセル"
```

**問題**：
- 自由テキストのため数値計算ができない
- 「この期間で何mg飲んだか」を算出できない
- 単位が統一されていない（"錠", "カプセル", "mg", "mL"など混在）

#### 2. 薬名の表記ゆれ

同じ薬でも入力方法によって別の薬として扱われる：
```
medicines:
  { name: "ロキソニン" }          // 10回服用
  { name: "ロキソニン錠" }        // 5回服用
  { name: "ロキソニン錠60mg" }    // 3回服用

統計結果：
  "ロキソニン": 10回
  "ロキソニン錠": 5回
  "ロキソニン錠60mg": 3回
  → 本当は合計18回なのに分散してしまう
```

**統計の精度が低下**：
- 薬別の服用回数が不正確
- 合計用量の計算ができない
- データ分析の信頼性が低い

---

## 決定

### 2つの機能を実装する

#### 1. 用量の数値化

`medicationSchedules.dosage` を構造化し、数値計算を可能にする。

#### 2. ユーザー主導の薬名統合機能

表記ゆれが発生した際に、ユーザーが「これとこれは同じ薬」と指定できる仕組みを導入する。

---

## 理由

### 1. 用量の数値化が必要な理由

#### ドメインとして自然
実際の服薬管理では用量は数値で扱われる：
- 医師の処方：「1日30mg」
- 薬剤師の説明：「1回10mg、1日3回」
- ユーザーの知りたい情報：「今月は合計で何mg飲んだか」

#### 統計機能の実現
数値化により以下が可能になる：
```typescript
// 期間別の統計
{
  medicineName: "ロキソニン",
  totalAmount: 300,          // 合計300mg
  totalDoses: 30,            // 30回服用
  unit: "mg",
  averagePerDay: 10,         // 1日平均10mg
  adherenceRate: 93.3,       // 服用率93.3%
}
```

### 2. ユーザー主導の統合機能が優れている理由

#### 軽量な実装
- 既存の `medicines` テーブルに影響なし
- スキーマ変更は新規テーブル追加のみ
- 表記ゆれが問題になった時だけ対処

#### ユーザーの柔軟性を尊重
- 「朝の薬」など自由な命名も可能
- 正式な薬名でなくても使える
- ユーザーが必要と判断した時だけ統合

#### 事後対応が可能
- 最初は自由に入力
- 統計を見て表記ゆれに気づいた時点で統合
- 過去のデータも含めて統計が正しくなる

#### グループローカルな管理
- グループごとに独立した統合設定
- 他のグループに影響しない
- プライバシーが保たれる

---

## 利点

### 用量の数値化

✅ **正確な統計**: 「何mg飲んだか」を正確に計算できる
✅ **データ分析**: 用量ベースのグラフ・レポート作成が可能
✅ **将来の拡張**: 薬の在庫管理、服用量の推移分析など
✅ **医療連携**: 医療機関への報告データとして活用可能

### 薬名統合機能

✅ **統計の精度向上**: 表記ゆれを解消し正確な統計
✅ **実装が軽量**: 既存データへの影響なし
✅ **ユーザー主導**: 必要な時だけ設定
✅ **柔軟性**: 自由な命名と統計精度の両立

---

## 欠点と対応策

### 用量の数値化

❌ **既存データの移行**: テストデータの再作成が必要
  → **対応**: 開発段階のため影響は最小限、migration不要

❌ **入力の複雑化**: 数値と単位を別々に入力する必要
  → **対応**:
  - デフォルト値の提供（よく使う単位）
  - 過去の入力から推測
  - プレースホルダーで例を表示

### 薬名統合機能

❌ **設定の手間**: ユーザーが統合設定を行う必要
  → **対応**:
  - 類似薬名の自動検出・提案
  - 統計画面で簡単に設定できるUI
  - 設定は任意（しなくても使える）

❌ **統計計算の複雑化**: グルーピングを考慮した集計が必要
  → **対応**:
  - ヘルパー関数で抽象化
  - パフォーマンス影響は最小限

---

## 代替案

### 代替案1: グローバル薬剤マスタの導入

外部API（JAPIC、KEGG DRUGなど）やマスタDBと連携。

**メリット**:
- 正確な薬剤情報（成分、標準用量など）
- 入力補完が充実
- 薬の相互作用チェックなど高度な機能

**デメリット**:
- 実装コストが非常に高い
- データのメンテナンス負荷
- API利用料の発生
- 自由な命名（「朝の薬」など）ができなくなる

**却下理由**:
- 個人・家族向けアプリには過剰
- 初期段階でのコスト対効果が低い
- ユーザーの柔軟性を損なう

### 代替案2: 正規化名フィールドの追加

`medicines` テーブルに `normalizedName` フィールドを追加。

```typescript
medicines: {
  displayName: v.string(),       // 表示名（自由入力）
  normalizedName: v.string(),    // 正規化名（統計用）
}
```

**メリット**:
- 別テーブル不要
- 実装がシンプル

**デメリット**:
- 既存データのスキーマ変更が必要
- 1対1の関係しか表現できない（複数の表記を1つにまとめられない）
- 正規化名を誰が決めるか不明確

**却下理由**:
- スキーマ変更の影響が大きい
- 柔軟性が低い

### 代替案3: 用量を文字列のままにする

統計時にパース処理で数値を抽出。

```typescript
// "10mg" → { amount: 10, unit: "mg" }
// "1錠" → { amount: 1, unit: "錠" }
```

**メリット**:
- スキーマ変更不要
- 既存データに影響なし

**デメリット**:
- パース処理が複雑・不安定
- 「1〜2錠」など範囲表記に対応できない
- バリデーションができない

**却下理由**:
- データの整合性が保証できない
- エラー処理が複雑

---

## 実装計画

### フェーズ1: スキーマ変更と基本機能

#### 1.1 用量フィールドの数値化

**スキーマ変更**:
```typescript
// convex/medications/schema.ts
medicationSchedules: defineTable({
  medicineId: v.id("medicines"),
  groupId: v.id("groups"),
  timings: v.array(v.union(...)),

  // 変更前
  // dosage: v.optional(v.string()),

  // 変更後
  dosage: v.optional(v.object({
    amount: v.number(),          // 数値（例: 10, 1.5）
    unit: v.string(),            // 単位（例: "mg", "錠", "mL"）
  })),

  notes: v.optional(v.string()),
  // ...
})
```

#### 1.2 薬名統合テーブルの追加

**新規テーブル**:
```typescript
// convex/medications/schema.ts に追加
medicineGroups: defineTable({
  groupId: v.id("groups"),
  canonicalName: v.string(),          // 代表名（例: "ロキソニン"）
  medicineNames: v.array(v.string()), // 統合する薬名リスト
  notes: v.optional(v.string()),      // メモ
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_groupId", ["groupId"])
```

**データ例**:
```json
{
  "groupId": "...",
  "canonicalName": "ロキソニン",
  "medicineNames": [
    "ロキソニン",
    "ロキソニン錠",
    "ロキソニン錠60mg"
  ]
}
```

### フェーズ2: 統計計算API

#### 2.1 期間別統計クエリ

**API設計**:
```typescript
// convex/medications/statistics/queries.ts (新規)
getMedicationStatsByPeriod: query({
  args: {
    groupId: v.id("groups"),
    patientId: v.optional(v.string()),
    medicineId: v.optional(v.id("medicines")),  // 特定の薬に絞る
    startDate: v.string(),                      // YYYY-MM-DD
    endDate: v.string(),                        // YYYY-MM-DD
  },
  returns: v.object({
    medicines: v.array(v.object({
      medicineId: v.string(),
      medicineName: v.string(),
      totalAmount: v.number(),       // 合計用量
      unit: v.string(),               // 単位
      totalDoses: v.number(),         // 服用回数
      takenCount: v.number(),         // 実際に服用した回数
      skippedCount: v.number(),       // スキップした回数
      adherenceRate: v.number(),      // 服用率
    })),
    summary: v.object({
      totalMedicines: v.number(),
      totalDoses: v.number(),
      overallAdherenceRate: v.number(),
    }),
  }),
})
```

#### 2.2 グルーピング適用ヘルパー

```typescript
// convex/medications/statistics/helpers.ts (新規)
export async function applyMedicineGrouping(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  stats: Record<string, MedicineStats>
): Promise<Record<string, MedicineStats>> {
  const groups = await ctx.db
    .query("medicineGroups")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .collect();

  const result = { ...stats };

  for (const group of groups) {
    let mergedStats = {
      totalAmount: 0,
      totalDoses: 0,
      takenCount: 0,
      skippedCount: 0,
      unit: "",
    };

    for (const medicineName of group.medicineNames) {
      if (result[medicineName]) {
        // 単位チェック（異なる単位の統合を警告）
        if (mergedStats.unit && mergedStats.unit !== result[medicineName].unit) {
          console.warn(`Unit mismatch in group: ${mergedStats.unit} vs ${result[medicineName].unit}`);
        }

        mergedStats.totalAmount += result[medicineName].totalAmount;
        mergedStats.totalDoses += result[medicineName].totalDoses;
        mergedStats.takenCount += result[medicineName].takenCount;
        mergedStats.skippedCount += result[medicineName].skippedCount;
        mergedStats.unit = result[medicineName].unit;

        delete result[medicineName];
      }
    }

    if (mergedStats.totalDoses > 0) {
      result[group.canonicalName] = {
        ...mergedStats,
        adherenceRate: (mergedStats.takenCount / mergedStats.totalDoses) * 100,
      };
    }
  }

  return result;
}
```

### フェーズ3: 薬名統合管理API

#### 3.1 Mutation

```typescript
// convex/medications/groups/mutations.ts (新規)

// グルーピング作成
createMedicineGroup: mutation({
  args: {
    groupId: v.id("groups"),
    canonicalName: v.string(),
    medicineNames: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 権限チェック
    // 既存グループとの重複チェック
    // グルーピング作成
  }
})

// グルーピング更新
updateMedicineGroup: mutation({
  args: {
    medicineGroupId: v.id("medicineGroups"),
    canonicalName: v.optional(v.string()),
    medicineNames: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 権限チェック
    // 更新
  }
})

// グルーピング削除
deleteMedicineGroup: mutation({
  args: {
    medicineGroupId: v.id("medicineGroups"),
  },
  handler: async (ctx, args) => {
    // 権限チェック
    // 削除
  }
})
```

#### 3.2 Query

```typescript
// convex/medications/groups/queries.ts (新規)

// グルーピング一覧取得
getMedicineGroups: query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    // グルーピング一覧を返す
  }
})

// 類似薬名の検出
findSimilarMedicineNames: query({
  args: {
    groupId: v.id("groups"),
    threshold: v.optional(v.number()), // 類似度閾値（0-1）
  },
  handler: async (ctx, args) => {
    // 類似した薬名のグループを提案
    // レーベンシュタイン距離などで判定
  }
})
```

### フェーズ4: UI実装

#### 4.1 統計画面

**ページ構成**:
- `/statistics` - 統計ダッシュボード

**表示内容**:
- 期間選択（月別、カスタム期間）
- 薬別の統計（用量、回数、服用率）
- グラフ（折れ線、棒グラフ）
- 類似薬名の警告・統合UI

#### 4.2 薬の統合管理画面

**ページ構成**:
- `/settings/medicine-groups` - 薬の統合管理

**機能**:
- 統合済みグループの一覧
- グループ作成ダイアログ
- グループ編集・削除
- 類似薬名の提案表示

#### 4.3 処方箋登録時のUI改善

**薬登録フォーム**:
```
薬名: [ロキソニン錠60mg____]

用量:
  数量: [1_____]
  単位: [mg ▼]  ← ドロップダウン
        - mg
        - 錠
        - カプセル
        - mL
        - g
        - その他

タイミング: ☑朝 ☑昼 ☐晩 ☐就寝前
```

---

## 技術的考慮事項

### 1. 単位の標準化

異なる単位の統合をどう扱うか：
- **対応**:
  - 基本的には同一単位のみ統合を推奨
  - 異なる単位を統合した場合は警告表示
  - 将来的には単位変換機能の追加を検討

### 2. パフォーマンス

大量のデータでの統計計算：
- **対応**:
  - インデックスの最適化
  - 必要に応じてキャッシュ導入
  - 期間を限定した集計

### 3. データ整合性

グルーピング設定と実データの整合性：
- **対応**:
  - 統合対象の薬名が存在しなくなった場合の処理
  - 自動的にクリーンアップするバッチ処理（将来）

### 4. 既存データの移行

dosageフィールドの変更：
- **対応**:
  - 開発段階のためmigration不要
  - テストデータは再作成
  - v.optional により後方互換性を保つ

---

## 関連ドキュメント

- [処方箋管理機能の導入 ADR](./2025-10-26-prescription-management.md)
- [服薬管理機能仕様](../specs/features/medication.md)
- [服薬記録履歴機能仕様](../specs/features/medication-history.md)
- [プロジェクト概要](../project.md)
- [アーキテクチャ](../architecture.md)

---

## 承認

| 役割 | 名前 | 日付 |
|------|------|------|
| 提案者 | AI | 2025-10-26 |
| レビュー | 開発者 | 2025-10-26 |
| 承認者 | 開発者 | 2025-10-26 |

---

## 実装状況

1. ✅ ADR作成（このドキュメント）
2. ✅ ユーザーによるレビューと承認
3. ✅ スキーマ変更（dosage数値化、medicineGroupsテーブル追加）
4. ✅ 統計計算APIの実装（タイミング別統計も追加）
5. ✅ 薬名統合管理APIの実装
6. ✅ UI実装（統計画面、ヘッダーナビゲーション）
7. ✅ 既存仕様書の更新

### 追加実装された機能

#### タイミング別統計
- 朝/昼/晩/就寝前の各タイミングごとの服用率を表示
- 頓服の統計を参考情報として別枠表示
- プログレスバーでの視覚的な表現

#### ヒストリーページの改善
- フィルター・検索機能の追加
  - 薬名検索（部分一致）
  - ステータスフィルター（服用済み/スキップ/未記録）
  - タイミングフィルター（朝/昼/晩/就寝前/頓服）
- カレンダーとフィルター結果の2カラム表示
- デフォルトで今日を選択状態に設定

#### 統計ページのUI改善
- 終了日を今日より未来に設定できないよう制限
- 開始日が終了日より後にならないよう制限
- デフォルト期間を「今月1日〜今日」に変更
- 期間選択の直感性向上

### 今後の拡張候補

- 薬の統合管理専用画面（`/settings/medicine-groups`）
- グラフ表示機能（折れ線グラフ、棒グラフ）
- 単位変換機能（mg ⇄ g など）
- エクスポート機能（CSV、PDF）

---

## 更新履歴

- 2025-10-26: 初版作成
- 2025-10-26: 実装完了、タイミング別統計・UI改善の追記
