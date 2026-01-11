# 同期チェック

仕様書と実装の同期状態をチェックし、不整合を検出する機能。

## 使用例

- 「仕様書との整合性を確認」
- 「ドキュメントの同期をチェック」
- 「仕様と実装のズレを検出」

---

## 実行フロー

### 1. 変更ファイルの取得
```bash
git diff main...HEAD --name-only
```

### 2. 機能名の抽出
変更ファイルから機能名を特定：
- `src/features/<name>/` → 機能名
- `convex/<name>/` → 機能名

### 3. 関連仕様書の検索
```bash
tsx ./.claude/skills/spec-assistant/scripts/find-related-specs.ts <file>
```

### 4. 同期状態のチェック
```bash
tsx ./.claude/skills/spec-assistant/scripts/check-sync.ts
```

---

## チェック項目

### 1. 仕様書の存在
- 実装に対応する仕様書が存在するか
- 仕様書のパスが正しいか

### 2. 更新日時
- 実装が仕様書より新しい場合は警告
- 7日以上の差がある場合は要確認

### 3. 内容の整合性
- API関数名が仕様書に記載されているか
- データモデルが一致しているか

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
