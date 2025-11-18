# 決定記録の分析

決定の傾向、履歴、競合を分析します。

## 利用可能な分析機能

### 1. 統計情報

**スクリプト**: `decision-stats.ts`

```bash
tsx ./.claude/skills/decision-assistant/scripts/decision-stats.ts
```

**機能**:
- 決定記録の総数
- ステータス別の内訳
- カテゴリ別の分布
- 月別の決定数推移
- 最も決定が多い技術スタック

**出力例**:
```
📊 決定記録統計

総決定数: 45件

ステータス別:
  ✅ 承認済み:     28件 (62%)
  📝 提案中:       12件 (27%)
  ✅ 実装完了:      3件 (7%)
  ❌ 却下:          2件 (4%)

カテゴリ別:
  🏗️  アーキテクチャ:  15件
  🔧 技術選定:       12件
  🎨 UI/UX:         8件
  🔒 セキュリティ:    6件
  ⚡ パフォーマンス:  4件

月別推移:
  2025-10: 12件
  2025-09:  8件
  2025-08:  5件

頻出技術:
  1. Next.js:   18件
  2. Convex:    15件
  3. React:     12件
  4. TypeScript: 10件
```

---

### 2. 決定履歴

**スクリプト**: `decision-history.ts`

```bash
# 全履歴を表示
tsx ./.claude/skills/decision-assistant/scripts/decision-history.ts

# 最新10件のみ表示
tsx ./.claude/skills/decision-assistant/scripts/decision-history.ts 10

# 最新5件のみ表示
tsx ./.claude/skills/decision-assistant/scripts/decision-history.ts 5
```

**機能**:
- 時系列順に決定記録を一覧表示
- ステータス、カテゴリ、決定者を表示
- 更新履歴も含めた完全な履歴

**出力例**:
```
📜 決定記録履歴 (最新10件)

2025-11-16 | ✅ 承認済み | アーキテクチャ | Claude Code スキル・サブエージェント基盤の確立
  決定者: 開発チーム
  概要: プロジェクトの生産性向上のため、Claude Code のスキル・サブエージェント基盤を導入

2025-10-26 | ✅ 承認済み | 技術選定 | pnpm への移行
  決定者: 開発チーム
  概要: パッケージ管理を npm から pnpm に移行し、ディスク容量とインストール速度を改善

2025-10-26 | ✅ 実装完了 | 機能設計 | グループ脱退・削除機能
  決定者: プロダクトチーム
  概要: ユーザーがグループから脱退、または管理者がグループを削除できる機能を実装
  更新: 2025-10-28 - 実装完了に伴いステータス更新

...
```

---

### 3. 競合検出

**スクリプト**: `find-conflicts.ts`

```bash
tsx ./.claude/skills/decision-assistant/scripts/find-conflicts.ts <keyword1> <keyword2> ...
```

**機能**:
- ステータスが「承認済み」「実装完了」の決定との競合を検出
- 同一カテゴリでの相反する決定を特定
- リスクレベル（1-3）で優先順位付け

**使用例**:
```bash
# 認証関連の競合を検出
tsx ./.claude/skills/decision-assistant/scripts/find-conflicts.ts 認証 auth

# データベース関連の競合を検出
tsx ./.claude/skills/decision-assistant/scripts/find-conflicts.ts database Convex
```

**出力例**:
```
⚠️  競合の可能性がある決定: 2件

🔴 リスク高 (レベル3):
  📄 2025-09-15-authentication-method-selection.md
    ステータス: 承認済み
    決定内容: 「認証にClerkを使用する」
    競合理由: 新しい決定「Convex Authへの移行」と矛盾
    推奨アクション: 既存決定を「廃止」に更新、または新決定を却下

🟡 リスク中 (レベル2):
  📄 2025-08-20-session-management.md
    ステータス: 実装完了
    決定内容: 「Clerk SDKでセッション管理」
    競合理由: Convex Auth移行により、セッション管理方法が変更される
    推奨アクション: 影響範囲を確認し、実装計画に含める
```

**リスクレベル**:
- **レベル3（高）**: 明確な矛盾、既存決定の変更が必須
- **レベル2（中）**: 関連する決定への影響あり、調整が必要
- **レベル1（低）**: 軽微な関連性、確認推奨

---

## 分析ワークフロー

### 1. プロジェクトの現状把握

```bash
# ステップ1: 統計情報で全体像を把握
tsx ./.claude/skills/decision-assistant/scripts/decision-stats.ts

# ステップ2: 最新の決定履歴を確認
tsx ./.claude/skills/decision-assistant/scripts/decision-history.ts 10
```

### 2. 新規決定前の競合チェック

```bash
# ステップ1: キーワードで競合検出
tsx ./.claude/skills/decision-assistant/scripts/find-conflicts.ts 認証 Convex

# ステップ2: 競合がある場合、該当決定を確認
# Read ツールで該当ファイルを読み込み

# ステップ3: 対応方針を決定
#   - 既存決定を廃止にする
#   - 新決定を却下する
#   - 両立可能な形に調整する
```

### 3. 定期レビュー

月次または四半期ごとに実施を推奨：

```bash
# ステップ1: 統計で傾向を分析
tsx ./.claude/skills/decision-assistant/scripts/decision-stats.ts

# ステップ2: 提案中のまま放置されている決定を確認
# （統計のステータス別内訳から判断）

# ステップ3: 古い決定の見直し
# （履歴から古い決定を確認し、現在も有効かチェック）
```

---

## ユースケース

### ユースケース1: 技術スタックの可視化

```bash
$ tsx ./.claude/skills/decision-assistant/scripts/decision-stats.ts

# 出力から頻出技術を確認
頻出技術:
  1. Next.js:   18件  ← 主要フレームワーク
  2. Convex:    15件  ← バックエンド
  3. React:     12件  ← UIライブラリ
  4. TypeScript: 10件  ← 言語

→ プロジェクトの技術スタックが明確に
```

### ユースケース2: 決定の一貫性確認

```bash
# 認証関連の全決定を確認
tsx ./.claude/skills/decision-assistant/scripts/find-conflicts.ts 認証

# 競合がある場合、過去の決定を見直し
tsx ./.claude/skills/decision-assistant/scripts/decision-history.ts

→ 認証方針の変遷を把握し、一貫性を保つ
```

### ユースケース3: 意思決定の速度測定

```bash
$ tsx ./.claude/skills/decision-assistant/scripts/decision-history.ts

月別推移:
  2025-11: 15件  ← 急増
  2025-10: 12件
  2025-09:  5件

→ 決定速度が上がっている → 開発が加速している
```

---

## 統計データの活用

### 1. プロジェクト報告

統計データを定期報告に活用：
- 技術的決定の総数
- 承認済み決定の数
- 主要な技術選定の履歴

### 2. オンボーディング

新メンバー向けに、決定履歴を時系列で共有：
```bash
tsx ./.claude/skills/decision-assistant/scripts/decision-history.ts 20
```

### 3. 技術負債の可視化

- 「提案中」のまま放置されている決定を特定
- 「承認済み」だが「実装完了」になっていない決定を確認

---

## 注意事項

1. **競合検出の限界**: キーワードベースのため、文脈的な矛盾は検出できない場合がある
2. **定期実行**: 統計は決定記録が増えるたびに実行すると、傾向が把握しやすい
3. **手動レビュー**: スクリプトの結果は補助情報として、最終判断は人間が行う
4. **パフォーマンス**: 決定記録が100件を超えると、スクリプトの実行に時間がかかる可能性がある
