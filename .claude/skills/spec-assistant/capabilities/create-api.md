# API仕様書の作成

API仕様書を対話形式で作成します。

## 実行フロー

### 1. 初期化フェーズ

#### 1-1. 現在日時の取得
```bash
TZ='Asia/Tokyo' date '+%Y年%m月%d日 %H:%M:%S JST'
```
- JST日時を「YYYY年MM月DD日」形式で取得
- 仕様書の「最終更新」に使用

#### 1-2. テンプレートの読み込み
`.context/specs/templates/api.template.md` を Read ツールで読み込み：
- 必須セクション、フォーマット、構造を把握
- プロジェクト固有のスタイルを理解

**または**、スクリプトでテンプレート一覧を取得：
```bash
./.claude/skills/spec-assistant/scripts/spec-list-templates.sh api
```

#### 1-3. 既存API仕様書の参照
`.context/specs/api/` から最新 3-5 件を Read ツールで読み込み：
- スタイル、詳細度、記述パターンを学習
- API設計パターンを把握

**または**、スクリプトで最新仕様書一覧を取得：
```bash
./.claude/skills/spec-assistant/scripts/spec-list-recent.sh 5 api
```

---

### 2. 対話フェーズ

#### 対話の柔軟性

**重要**: 以下のステップは推奨フローですが、ユーザーが既に十分な情報を提供している場合は該当ステップをスキップできます。

#### ステップ1: API概要のヒアリング

「このAPIが提供する機能を教えてください」
- APIの目的
- 主要な操作

#### ステップ2: Queries（データ取得）の確認

「どんなデータ取得が必要ですか？」
- 関数名
- 引数・戻り値
- 認証要否

#### ステップ3: Mutations（データ更新）の確認

「どんなデータ更新が必要ですか？」
- 関数名
- 引数・戻り値
- バリデーションルール
- 副作用（作成・更新・削除するテーブル）

#### ステップ4: Actions（外部連携）の確認（該当する場合）

「外部APIとの連携が必要ですか？」
- 外部サービス名
- 処理フロー
- リトライ戦略

#### ステップ5: エラーハンドリングの確認

「想定されるエラーケースは？」
- 認証エラー
- バリデーションエラー
- ビジネスルールエラー

---

### 3. 生成フェーズ

収集した情報を `.context/specs/templates/api.template.md` のフォーマットに基づいて構造化します。

#### ファイル名の決定

機能名から自動的に `[feature-name]-api.md` 形式で生成：

**変換例**:
- 「通知API」 → `notification-api.md`
- 「グループ管理API」 → `group-api.md`
- 「認証API」 → `auth-api.md`

**命名ルール**:
- 英数字と `-` のみ使用
- すべて小文字
- スペースは `-` に変換
- 日本語は英訳してkebab-case化
- **必ず `-api.md` で終わる**

**スクリプトで kebab-case 変換**:
```bash
./.claude/skills/spec-assistant/scripts/spec-to-kebab-case.sh "通知API"
# 出力: notification-api
```

#### 関数の構造化

各関数（Query/Mutation/Action）を以下の形式で記述：

**Query の例**:
```markdown
### `getNotifications`

**用途**: ユーザーの通知一覧を取得

**認証**: 必須

**引数**:
- `userId`: Id<"users"> - 対象ユーザーID
- `limit?`: number - 取得件数（デフォルト: 50）

**戻り値**:
- `Notification[]` - 通知の配列

**エラー**:
- 認証エラー: ユーザー未認証
- 権限エラー: 他人の通知は取得不可

**実装例**:
\`\`\`typescript
export const getNotifications = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // ...
  }
});
\`\`\`
```

---

### 4. バリデーションフェーズ

生成した仕様書が以下の基準を満たしているか確認：

#### 必須項目チェックリスト

- [ ] **タイトル**: APIの対象機能が明確に表現されているか
- [ ] **最終更新**: YYYY年MM月DD日形式で正しく記載されているか
- [ ] **概要**: APIの提供機能が1-2文で説明されているか
- [ ] **関数定義**: 各関数に引数・戻り値・エラーが記載されているか
- [ ] **コード例**: TypeScript形式で実装例が記述されているか

#### 品質基準チェック

- [ ] **具体性**: 各関数の用途と挙動が明確に記述されているか
- [ ] **実装可能性**: 開発者がこの仕様書から実装を開始できるか
- [ ] **一貫性**: 既存のAPI仕様書と矛盾していないか
- [ ] **型安全性**: すべての引数・戻り値に型が明示されているか

#### 自動チェック項目

- [ ] ファイル名: `[feature-name]-api.md` 形式
- [ ] ファイルパス: `.context/specs/api/` 配下
- [ ] 文字エンコーディング: UTF-8
- [ ] 改行コード: LF（Unix形式）

**スクリプトで検証**:
```bash
./.claude/skills/spec-assistant/scripts/spec-validate.sh .context/specs/api/notification-api.md
```

---

### 5. 出力フェーズ

`.context/specs/api/[feature-name]-api.md` に Write ツールで保存し、ユーザーに確認を促します。

---

## 生成される仕様書の構成

プロジェクトのテンプレート（`.context/specs/templates/api.template.md`）に準拠して生成：

**主要セクション**:
- **概要**
- **Queries（データ取得）**
  - 用途、認証、引数、戻り値、エラー、例
- **Mutations（データ更新）**
  - 用途、認証、引数、戻り値、バリデーション、副作用、エラー、例
- **Actions（外部連携）**
  - 用途、認証、引数、戻り値、処理フロー、リトライ、エラー、例
- **内部関数（Internal）**
- **データモデル**
- **認可ルール**
- **ユースケース**
- **テストケース**
- **関連ドキュメント**

詳細な構造は `.context/specs/templates/api.template.md` を参照してください。

---

## 参照リソース

### プロジェクトドキュメント

API仕様書作成時に参照すべきドキュメント：
- `.context/architecture.md` - アーキテクチャ全体像、データモデル
- `.context/coding-style.md` - コーディング規約（API設計パターン）
- `.context/error-handling.md` - エラーハンドリング戦略
- `.context/testing-strategy.md` - テスト戦略

---

## Convex固有のAPI設計パターン

### Query（データ取得）

**特徴**:
- 読み取り専用（副作用なし）
- リアルタイムサブスクリプション可能
- 認証チェックは `ctx.auth.getUserIdentity()` で実施

**パターン**:
```typescript
export const getItem = query({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("認証が必要です");

    return await ctx.db.get(args.id);
  }
});
```

### Mutation（データ更新）

**特徴**:
- データの作成・更新・削除
- トランザクション保証
- 副作用の記述が必須

**パターン**:
```typescript
export const createItem = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("認証が必要です");

    return await ctx.db.insert("items", {
      name: args.name,
      userId: identity.subject
    });
  }
});
```

### Action（外部連携）

**特徴**:
- 外部APIの呼び出し
- Query/Mutationの呼び出し
- リトライ戦略の実装

**パターン**:
```typescript
export const sendNotification = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 外部API呼び出し
    const response = await fetch("https://api.example.com");

    // Mutationの呼び出し
    await ctx.runMutation(api.notifications.create, { ... });
  }
});
```

---

## 注意事項

1. **型安全性**: すべての引数・戻り値に型を明示
2. **認証**: 各関数の認証要否を明確化
3. **副作用**: Mutationの副作用（作成・更新・削除するテーブル）を明記
4. **エラーハンドリング**: 想定されるエラーケースをすべて記載
5. **実装例**: TypeScript形式でコード例を提供
