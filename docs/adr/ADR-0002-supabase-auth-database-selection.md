# ADR-0002 Supabase認証・データベースプラットフォーム選定

## ステータス

Accepted

## 変更履歴

- 2025-08-20: 初版作成

## コンテキスト

お薬サポートアプリケーションにおいて、患者本人と支援者の1対1ペア構造による認証・権限管理システムと、医療関連データを安全に管理するデータベース基盤の選定が必要となった。

### 技術的背景

**既存基盤**: ADR-0001で決定したNext.js 15 + TypeScript + Feature-based Architectureの基盤が構築済み

**要件**: PRD supabase-auth-setup-prd.mdで定義された以下の要件を満たす必要がある：
- ペアベース権限システム（患者・支援者1対1構造）
- 双方向招待システム（どちらからでも招待可能）
- RLS（Row Level Security）による厳格なデータアクセス制御
- メール認証フロー
- セッション管理とセキュリティ設定

### プロジェクト制約

- **「共同体としてのサポート」思想**: 支援者は管理者ではなく協力者
- **医療関連データの安全性**: 個人情報・健康情報の適切な保護が必須
- **Feature-based Architecture準拠**: `lib/`と`features/`構造への統合が必要
- **TypeScript strict mode**: any型禁止の型安全性確保
- **開発効率**: LLM主導実装に最適な開発体験

## 決定事項

**Supabase**を認証・データベースプラットフォームとして採用する。

具体的な採用内容：
- **Supabase Auth**: メール認証、セッション管理、OAuth対応
- **Supabase Database**: PostgreSQL + RLS機能
- **Supabase Client**: Next.js 15との統合ライブラリ
- **型生成**: Supabase CLIによるTypeScript型自動生成

## 根拠

### 検討した選択肢

#### 案A: Firebase (Google)
**概要**: Googleが提供するBaaS（Backend as a Service）プラットフォーム

**利点**:
- 成熟したエコシステムと豊富なドキュメント
- リアルタイムデータベース（Firestore）の高いパフォーマンス
- 豊富なOAuth認証プロバイダー（Google、Apple、Facebook等）
- GCPとの統合による高い可用性
- NoSQLの柔軟性

**欠点**:
- **RLS機能の不足**: Firestoreのセキュリティルールは複雑で、SQLライクなRLSが不可能
- **複雑な権限設計**: ペアベースの細かい権限制御が困難
- **TypeScript統合**: 型安全性の確保に追加設定が必要
- **ベンダーロック**: Google固有の機能に依存
- **NoSQL制約**: リレーショナルな医療データ管理に不適切

#### 案B: AWS Amplify + Cognito
**概要**: AWSが提供する認証・データベース統合プラットフォーム

**利点**:
- エンタープライズグレードのセキュリティ
- AWS RDS（PostgreSQL）との完全統合
- IAMとの統合による高度な権限管理
- スケーラビリティと可用性
- HIPAA準拠の医療データ対応

**欠点**:
- **設定の複雑性**: 認証とDB統合に多数の設定ファイルが必要
- **学習コスト**: AWS特有の概念（IAM、VPC等）の理解が必須
- **開発体験**: ローカル開発環境のセットアップが複雑
- **コスト**: 小規模開始時でも固定費が発生
- **Feature-based統合**: 複数AWSサービスの統合で構造が複雑化

#### 案C: Supabase（採用）
**概要**: オープンソースのFirebase代替、PostgreSQL + RESTful API

**利点**:
- **RLS完全対応**: PostgreSQLネイティブのRow Level Securityで細かい権限制御が可能
- **型安全性**: Supabase CLI自動型生成によりTypeScript strict mode完全対応
- **Feature-based統合**: シンプルな`lib/supabase`設定で統合可能
- **開発体験**: ローカル開発環境が簡単（Docker Compose一発）
- **PostgreSQL**: リレーショナルDBによる医療データの適切な正規化
- **オープンソース**: ベンダーロック回避、自己ホスト可能

**欠点**:
- **新興プラットフォーム**: 2020年開始でFirebaseより実績が少ない
- **エコシステム**: サードパーティ統合がFirebaseより限定的
- **スケール実績**: 大規模運用の事例がFirebase/AWSより少ない

### 技術比較マトリクス

| 評価軸 | Firebase | AWS Amplify | Supabase（採用） |
|--------|----------|-------------|-----------------|
| RLS対応 | ❌ 制限的 | ⭕ IAM統合 | ⭕ PostgreSQLネイティブ |
| TypeScript統合 | ⚠️ 設定必要 | ⚠️ 複雑 | ⭕ 自動生成 |
| Feature-based親和性 | ❌ 複雑 | ❌ 非常に複雑 | ⭕ シンプル統合 |
| 開発体験 | ⭕ 優秀 | ❌ 複雑 | ⭕ 優秀 |
| ペア権限制御 | ❌ 困難 | ⭕ 可能 | ⭕ 最適 |
| 医療データ対応 | ⚠️ NoSQL制約 | ⭕ HIPAA準拠 | ⭕ PostgreSQL最適 |
| 学習コスト | 低 | 高 | 中 |
| ベンダーロック | 高 | 高 | 低（OSS） |
| 初期コスト | 無料枠大 | 固定費あり | 無料枠適切 |
| 総合適合性 | 60% | 70% | 90% |

### 決定的要因

1. **RLS（Row Level Security）の完全対応**
   - 患者・支援者のペア単位でのデータアクセス制御が必須
   - PostgreSQLネイティブRLSにより以下が実現可能：
     ```sql
     -- 患者本人のみ自分のデータにアクセス
     CREATE POLICY patient_own_data ON medication_records
     FOR ALL USING (auth.uid() = patient_id);
     
     -- 支援者は承認されたペアの患者データのみ閲覧
     CREATE POLICY supporter_pair_data ON medication_records
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM user_pairs 
         WHERE supporter_id = auth.uid() 
         AND patient_id = medication_records.patient_id
         AND status = 'approved'
       )
     );
     ```

2. **TypeScript strict mode完全対応**
   - Supabase CLI `supabase gen types typescript`による型自動生成
   - any型使用禁止ルールを完全に遵守可能
   - 例：
     ```typescript
     // 自動生成される型定義
     type Database = {
       public: {
         Tables: {
           users: {
             Row: { id: string; email: string; role: 'patient' | 'supporter' }
             Insert: { email: string; role: 'patient' | 'supporter' }
             Update: { email?: string; role?: 'patient' | 'supporter' }
           }
         }
       }
     }
     ```

3. **Feature-based Architecture最適統合**
   - `lib/supabase.ts`での一元設定
   - `features/auth/`での機能完結実装
   - 他案では複数ファイル・複数サービスの設定が必要

## 影響

### ポジティブな影響

- **開発効率向上**: TypeScript型自動生成により開発速度とバグ検出精度が大幅向上
- **セキュリティ強化**: PostgreSQL RLSによる医療データの厳格なアクセス制御実現
- **保守性向上**: オープンソースによりベンダーロック回避、長期保守性確保
- **アーキテクチャ整合性**: Feature-based Architectureとの完全な統合
- **スケーラビリティ**: PostgreSQLによるリレーショナルデータの適切な正規化
- **開発体験**: ローカル環境でのフル機能開発・テスト環境

### ネガティブな影響

- **新技術学習**: チーム全体でのSupabase特有概念の習得が必要
- **エコシステム制約**: Firebase/AWS比較で一部サードパーティ統合に制限
- **運用実績**: 大規模運用事例がFirebaseより少ない点でのリスク
- **移行コスト**: 将来的にFirebase/AWSへの移行時コストが発生する可能性

### 中立的な影響

- **開発プロセス変更**: SQL中心のデータモデリングへの移行
- **認証フロー変更**: Supabase Auth特有のセッション管理パターンの採用
- **デプロイプロセス変更**: Supabase CLI統合によるマイグレーション管理

## 実装への指針

### アーキテクチャ統合原則

- **集約パターン**: `lib/supabase/`で設定を一元管理、認証・DB・型定義を統合
- **機能分離**: `features/auth/`で認証機能を完結、他機能との疎結合を維持
- **型安全性**: Supabase型定義を`types/`で再エクスポート、プロジェクト全体での一貫性確保

### セキュリティ原則

- **RLS First**: 全てのテーブルでRow Level Securityを有効化
- **最小権限**: ユーザーロール（patient/supporter）に基づく最小限のアクセス権限付与
- **セッション管理**: Supabase Authによる適切なトークン管理とリフレッシュ

### データ設計原則

- **正規化**: 患者・支援者・ペア関係の適切な正規化設計
- **監査ログ**: 医療データアクセスの完全なログ記録
- **暗号化**: 機密データのアプリケーションレベル暗号化併用

### パフォーマンス原則

- **インデックス戦略**: ペア検索・権限チェック用の最適インデックス設計
- **キャッシュ戦略**: 認証状態・ユーザー情報の適切なクライアントキャッシュ
- **コネクション管理**: Supabase接続プールの効率的活用

## 関連情報

### 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs) - 認証・データベース統合ガイド
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) - 医療データ保護の実装方法
- [Next.js + Supabase統合](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs) - Next.js 15対応統合手順
- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/generating-types) - 型自動生成による型安全性
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - RLS技術仕様
- [HIPAA Compliance with Supabase](https://supabase.com/docs/guides/resources/supabase-cli/local-development#seeding-your-database) - 医療データ保護基準
- 関連PRD: `docs/prd/supabase-auth-setup-prd.md` - ビジネス要件とユーザーストーリー
- 関連ADR: `ADR-0001-nextjs-tech-stack-selection.md` - Next.js基盤技術選定

### 関連ADR（今後作成予定）

- ADR-0003: Supabase RLSポリシー設計原則
- ADR-0004: ペアベース権限システム実装方針
- ADR-0005: 医療データ暗号化・匿名化戦略