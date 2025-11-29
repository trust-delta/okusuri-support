---
name: doc-sync
description: 仕様書と実装の同期をチェックする。実装変更時に関連仕様書を検出し、不整合を警告する。
---

# Doc Sync

仕様書と実装の同期状態をチェックし、不整合を検出するスキル。

## 利用可能な機能

### 1. 同期チェック
変更されたファイルに関連する仕様書を検出し、同期状態をチェックします。

**使用例**:
- 「仕様書との整合性を確認」
- 「ドキュメントの同期をチェック」
- 「関連仕様書を確認」

---

### 2. 関連仕様書の検出
実装ファイルから関連する仕様書を検索します。

**使用例**:
- 「この機能の仕様書はどこ？」
- 「関連ドキュメントを探して」

---

### 3. 不整合レポート
仕様書と実装の不整合を検出してレポートします。

**使用例**:
- 「不整合がないか確認」
- 「仕様と実装のズレを検出」

---

## 基本的な実行フロー

### 1. 変更ファイルの取得
```bash
git diff main...HEAD --name-only
```

### 2. 関連仕様書の検索
変更ファイルから関連する仕様書を特定

### 3. 同期チェック
- 仕様書の存在確認
- 更新日時の比較
- 内容の整合性確認

### 4. 結果レポート
不整合があれば警告

---

## ファイルマッピング

### 機能仕様書
| 実装パス | 仕様書パス |
|---------|-----------|
| `src/features/<name>/` | `.context/specs/features/<name>.md` |
| `convex/<name>/` | `.context/specs/features/<name>.md` |

### API仕様書
| 実装パス | 仕様書パス |
|---------|-----------|
| `convex/<name>/queries.ts` | `.context/specs/api/<name>-api.md` |
| `convex/<name>/mutations.ts` | `.context/specs/api/<name>-api.md` |
| `convex/<name>/actions.ts` | `.context/specs/api/<name>-api.md` |

---

## チェック項目

### 1. 仕様書の存在
- 実装に対応する仕様書が存在するか
- 仕様書のパスが正しいか

### 2. 更新日時
- 実装が仕様書より新しい場合は警告
- 大幅な時間差がある場合は確認を推奨

### 3. 内容の整合性
- API関数名が仕様書に記載されているか
- データモデルが一致しているか
- 機能要件が実装されているか

---

## 出力フォーマット

```markdown
## 同期チェック結果

### 変更されたファイル
- src/features/medication/components/MedicationList.tsx
- convex/medication/mutations.ts

### 関連仕様書
- .context/specs/features/medication.md (最終更新: 2025-11-20)
- .context/specs/api/medication-api.md (最終更新: 2025-11-15)

### 不整合の検出

#### ⚠️ 要確認
- **medication.md**: 実装が仕様書より新しいです（9日差）
  - 仕様書の更新を検討してください

#### 🔴 不整合
- **medication-api.md**: `duplicatePrescription` mutation が仕様書に未記載
  - 仕様書への追記が必要です

### 推奨アクション
1. `.context/specs/features/medication.md` を更新
2. `.context/specs/api/medication-api.md` に `duplicatePrescription` を追記
```

---

## 利用可能なスクリプト

| スクリプト | 機能 | 使用コマンド |
|----------|------|------------|
| find-related-specs.ts | 関連仕様書検索 | `tsx scripts/find-related-specs.ts <file>` |
| check-sync.ts | 同期チェック | `tsx scripts/check-sync.ts` |

---

## 注意事項

1. **CLAUDE.mdの重要ルール**: 仕様書と実装は常に同期すること
2. **実装変更時**: 関連仕様書も同時に更新
3. **仕様書が存在しない場合**: 新規作成を提案

---

**最終更新**: 2025年11月29日
