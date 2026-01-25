# テストデータ投入機能（Seeding）仕様

**最終更新**: 2026年1月19日

## 概要

開発・テスト時のブラウザ検証用にサンプルデータを投入・リセットする機能。テストユーザー専用で、実際の処方箋・薬剤・服薬記録などの一式を簡単に生成できる。Claude Codeのbrowser-verifyスキルと連携して使用する。

---

## ユースケース

### 主要シナリオ

**シナリオ1: ブラウザ検証前のデータ準備**
1. 開発者がテストアカウント（test@example.com）でログイン
2. CLIからseedコマンドを実行
3. 処方箋2件、薬剤4種、過去7日分の服薬記録が自動生成
4. ブラウザでダッシュボードを確認し、データが表示される

**シナリオ2: テスト後のデータリセット**
1. 検証作業完了後、クリーンな状態に戻したい
2. CLIからresetコマンドを実行
3. グループは維持しつつ、処方箋・薬剤・記録等を論理削除
4. ブラウザで「今日服用する薬がありません」が表示される

**シナリオ3: 異なるテストユーザーでの検証**
1. supporter@example.com用のデータを投入したい
2. `EMAIL=supporter@example.com` を指定してseedコマンド実行
3. そのユーザー専用のグループにデータが投入される

---

## 機能要件

### サンプルデータ投入

#### データ投入
- **説明**: テストユーザーに対して一式のサンプルデータを投入
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `convex/seeding/actions.ts`

#### データリセット
- **説明**: 投入したデータを論理削除して初期状態に戻す
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `convex/seeding/actions.ts`

#### 状態確認
- **説明**: テストユーザーのデータ投入状況を確認
- **優先度**: 中
- **実装状況**: 完了
- **実装場所**: `convex/seeding/actions.ts`

### CLI連携

#### シェルスクリプト
- **説明**: `npx convex run` を簡単に呼び出すラッパースクリプト
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `.claude/skills/browser-verify/scripts/seed-test-data.sh`

---

## 投入されるサンプルデータ

### 処方箋

| 名前 | 開始日 | 終了日 | 備考 |
|------|--------|--------|------|
| 内科定期処方 | 30日前 | 60日後 | 高血圧・糖尿病の定期処方 |
| 整形外科処方 | 14日前 | 14日後 | 腰痛治療 |

### 薬剤

| 薬名 | 処方箋 | タイミング | 用量 | 在庫 | 警告閾値 |
|------|--------|-----------|------|------|---------|
| アムロジピン錠5mg | 内科定期処方 | 朝 | 1錠 | 30 | 7 |
| メトホルミン錠250mg | 内科定期処方 | 朝・夕 | 1錠 | 45 | 14 |
| ロキソプロフェン錠60mg | 整形外科処方 | 朝・昼・夕 | 1錠 | 21 | 7 |
| レバミピド錠100mg | 整形外科処方 | 朝・昼・夕 | 1錠 | 21 | 7 |

### 服薬記録

各薬剤の各タイミングに対して8日分（今日＋過去7日）の記録を生成:

| 期間 | ステータス |
|------|-----------|
| 今日 | pending |
| 1〜2日前 | 80%がtaken、20%がpending |
| 3〜7日前 | すべてtaken |

---

## テストユーザー

### 許可されたメールアドレス

```typescript
const TEST_EMAILS = [
  "test@example.com",
  "supporter@example.com",
  "patient@example.com",
];
```

### 認証プロバイダー

以下のプロバイダーで登録されたユーザーを検索:
- `password`（パスワード認証）
- `resend-otp`（OTP認証）

---

## ビジネスルール

### データ投入

1. **テストユーザー限定**: TEST_EMILSに含まれるメールアドレスのみ実行可能
2. **クリーンスタート**: 投入前に既存データを削除（重複防止）
3. **グループ自動作成**: グループが存在しない場合は自動作成

### データリセット

1. **論理削除**: 処方箋・薬剤・スケジュール・記録は論理削除（deletedAt設定）
2. **物理削除**: 在庫・アラート・消費記録は物理削除
3. **グループ維持**: グループ自体は削除しない

---

## API設計

### Queries

#### `getSeedStatus`
- **用途**: 現在のユーザーのサンプルデータ投入状況を取得
- **認証**: 必須（認証済みユーザーの情報を返す）
- **引数**: なし
- **戻り値**:
  ```typescript
  {
    isAuthenticated: boolean,
    isTestUser: boolean,
    hasSeedData: boolean,
    groupId?: Id<"groups">,
    prescriptionCount?: number,
  }
  ```

### Mutations

#### `seedTestData`
- **用途**: ログイン中のテストユーザーにサンプルデータを投入
- **認証**: 必須（テストユーザーのみ）
- **引数**: なし
- **戻り値**:
  ```typescript
  {
    success: boolean,
    message: string,
    groupId: Id<"groups">,
    prescriptionCount: number,
    medicineCount: number,
  }
  ```
- **副作用**:
  - prescriptions: 作成（2件）
  - medicines: 作成（4件）
  - medicationSchedules: 作成（4件）
  - medicineInventory: 作成（4件）
  - medicationRecords: 作成（複数件）

#### `resetTestData`
- **用途**: テストユーザーのデータをリセット
- **認証**: 必須（テストユーザーのみ）
- **引数**: なし
- **戻り値**:
  ```typescript
  {
    success: boolean,
    message: string,
    deletedPrescriptions: number,
    deletedMedicines: number,
    deletedSchedules: number,
    deletedRecords: number,
    deletedInventory: number,
    deletedAlerts: number,
    deletedConsumptions: number,
  }
  ```

### Internal Functions（CLI用）

#### `internal_seedTestData`
- **用途**: CLIからサンプルデータを投入
- **引数**: `{ email: string }`
- **使用方法**:
  ```bash
  npx convex run seeding/actions:internal_seedTestData '{"email":"test@example.com"}'
  ```

#### `internal_resetTestData`
- **用途**: CLIからデータをリセット
- **引数**: `{ email: string }`
- **使用方法**:
  ```bash
  npx convex run seeding/actions:internal_resetTestData '{"email":"test@example.com"}'
  ```

#### `internal_getTestUserInfo`
- **用途**: テストユーザーの情報を取得
- **引数**: `{ email: string }`
- **使用方法**:
  ```bash
  npx convex run seeding/actions:internal_getTestUserInfo '{"email":"test@example.com"}'
  ```

#### `internal_debugAuthAccounts`
- **用途**: authAccountsテーブルのデバッグ情報を取得
- **引数**: `{ email: string }`

---

## CLI利用方法

### シェルスクリプト

```bash
# サンプルデータ投入
bash .claude/skills/browser-verify/scripts/seed-test-data.sh seed

# データリセット
bash .claude/skills/browser-verify/scripts/seed-test-data.sh reset

# 状態確認
bash .claude/skills/browser-verify/scripts/seed-test-data.sh status

# 別のテストユーザーに対して実行
EMAIL=supporter@example.com bash .claude/skills/browser-verify/scripts/seed-test-data.sh seed
```

### 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| EMAIL | test@example.com | 対象のテストメールアドレス |

---

## エラーハンドリング

| エラータイプ | メッセージ | 発生条件 | ユーザーアクション |
|--------------|-----------|----------|-------------------|
| 認証エラー | "認証が必要です" | 未ログイン | ブラウザでログイン |
| 権限エラー | "この機能はテストユーザー専用です" | テストユーザー以外 | テストアカウントでログイン |
| ユーザー未登録 | "ユーザーが見つかりません。先にブラウザからログインしてください" | CLIで未登録ユーザー指定 | ブラウザで一度ログイン |

---

## セキュリティ要件

### 認可

- テストユーザーのメールアドレスをハードコードでチェック
- 本番データへの影響を防止

### 注意事項

- この機能は開発・テスト環境専用
- 本番環境ではテストユーザーでのログインを制限すること（別途対応）

---

## 依存関係

### 内部依存

- **グループ機能**: グループ作成・メンバー追加
- **服薬管理機能**: 処方箋・薬剤・スケジュール・記録作成
- **在庫管理機能**: 在庫データ作成
- **Convex Auth**: ユーザー認証・authAccountsテーブル

### 外部依存

- なし

---

## マイルストーン

### Phase 1: 基本機能（完了）
- [x] サンプルデータ定義
- [x] seed mutation実装
- [x] reset mutation実装
- [x] CLI用internal functions
- [x] シェルスクリプト作成
- [x] browser-verifyスキルへの統合

### Phase 2: 拡張（未着手）
- [ ] UIからのデータ投入（管理画面）
- [ ] 投入データのカスタマイズ
- [ ] 複数パターンのサンプルデータ

---

## 関連ドキュメント

- [browser-verifyスキル](.claude/skills/browser-verify/SKILL.md)
- [服薬管理機能](medication.md)
- [グループ管理機能](group.md)
