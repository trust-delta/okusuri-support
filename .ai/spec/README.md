# .ai/spec/ - 仕様書

**最終更新**: 2025年10月16日

このディレクトリには、プロジェクトの仕様書が格納されています。

---

## ディレクトリ構成

```
.ai/spec/
├── README.md (このファイル)
├── features/              # 機能仕様書
│   ├── auth.md           # 認証機能
│   ├── group.md          # グループ管理
│   ├── medication.md     # 服薬管理
│   └── onboarding.md     # オンボーディング
├── api/                   # API仕様
│   └── conventions.md     # API設計規約
└── templates/             # 仕様書テンプレート
    ├── api.template.md    # API仕様テンプレート
    └── feature.template.md # 機能仕様テンプレート
```

---

## 機能仕様書

### [features/auth.md](features/auth.md) - 認証機能
- パスワード認証・OTPメール認証
- JWT管理、セキュリティ要件

### [features/group.md](features/group.md) - グループ管理
- グループCRUD、メンバー管理
- 招待コード/リンク機能

### [features/medication.md](features/medication.md) - 服薬管理
- 薬剤マスタ、スケジュール、記録、履歴
- 服薬継続率計算

### [features/onboarding.md](features/onboarding.md) - オンボーディング
- ロール選択、プロフィール設定
- 初期グループ自動作成

---

## 仕様書の構成

各機能仕様書は以下の構成:

1. **概要**: 機能の目的
2. **データモデル**: テーブル構造、インデックス
3. **機能**: 主要機能とAPI仕様
4. **UI実装**: コンポーネント構成
5. **エラーハンドリング**: エラーケースと対応
6. **テスト**: テスト方針
7. **制限事項**: 現在の制約
8. **関連ドキュメント**: リンク

---

## 更新方針

### 逆算的仕様書
このディレクトリの仕様書は**実装から逆算**して作成されています。

**更新タイミング**:
- 機能追加時: 新規仕様書を追加
- 機能変更時: 該当仕様書を更新
- バグ修正時: エラーハンドリングセクションを更新

---

## データモデル全体図

```
users
  │
  ├─ groupMembers ─── groups
  │                     │
  │                     ├─ groupInvitations
  │                     ├─ medicines
  │                     │    └─ medicationSchedules
  │                     └─ medicationRecords
  │                          └─ medicationRecordsHistory
  │
  └─ (authTables from Convex Auth)
```

---

## API概要

### Queries（読み取り専用）
- `groups.queries.list`: グループ一覧
- `medicines.queries.list`: 薬剤一覧
- `medicationRecords.queries.getByDate`: 日別服薬記録
- `invitations.queries.list`: 招待一覧

### Mutations（データ更新）
- `groups.mutations.create`: グループ作成
- `medicines.mutations.create`: 薬剤登録
- `medicationRecords.mutations.create`: 服薬記録作成
- `invitations.mutations.create`: 招待コード生成
- `invitations.mutations.accept`: 招待受諾

---

## API設計規約

### [api/conventions.md](api/conventions.md)
Convex APIの統一的な設計規約:
- 命名規約（Query/Mutation/Action）
- 認証・認可パターン
- バリデーション・エラーハンドリング
- データアクセスパターン
- レスポンス形式

---

## テンプレート

### [templates/api.template.md](templates/api.template.md)
新規API仕様書を作成する際のテンプレート。

### [templates/feature.template.md](templates/feature.template.md)
新規機能仕様書を作成する際のテンプレート。

---

## 関連ドキュメント

- [プロジェクト概要](../context/project.md)
- [アーキテクチャ](../context/architecture.md)
- [データベーススキーマ](../../convex/schema.ts)
- [テスト戦略](../context/testing-strategy.md)
