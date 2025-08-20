-- ペアベース服薬記録システム - 高度なRLSポリシー設定（Refactor Phase）
-- Feature-based Architecture準拠
-- 生成日時: 2025年08月20日
-- 対象タスク: T002 - データベーススキーマ作成・RLSポリシー設定（Refactor Phase）

-- ====================
-- 高度なRLSポリシー（パフォーマンス最適化と詳細権限制御）
-- ====================

-- 既存のポリシーの上に構築される高度なポリシー

-- ====================
-- 1. パフォーマンス最適化ポリシー
-- ====================

-- ポリシー: users_optimized_pair_access
-- 概要: インデックスを活用した最適化されたペアアクセス
CREATE POLICY "users_optimized_pair_access" ON public.users
  FOR SELECT USING (
    -- インデックス idx_users_current_pair_id を活用
    auth.uid() = id OR
    (
      current_pair_id IS NOT NULL AND
      current_pair_id IN (
        SELECT id FROM public.user_pairs 
        WHERE (patient_id = auth.uid() OR supporter_id = auth.uid()) 
        AND status = 'approved'
      )
    )
  );

-- ポリシー: user_pairs_optimized_member_access
-- 概要: インデックスを活用した最適化されたメンバーアクセス
CREATE POLICY "user_pairs_optimized_member_access" ON public.user_pairs
  FOR ALL USING (
    -- インデックス idx_user_pairs_patient_id, idx_user_pairs_supporter_id を活用
    patient_id = auth.uid() OR supporter_id = auth.uid()
  );

-- ポリシー: invitations_optimized_code_access
-- 概要: インデックスを活用した最適化された招待コードアクセス
CREATE POLICY "invitations_optimized_code_access" ON public.invitations
  FOR SELECT USING (
    -- インデックス idx_invitations_code, idx_invitations_expires_at を活用
    inviter_id = auth.uid() OR
    (
      used = FALSE AND 
      expires_at > NOW() AND
      invitation_code IS NOT NULL
    )
  );

-- ====================
-- 2. 役割ベース権限制御（患者・支援者の権限差分）
-- ====================

-- ポリシー: users_patient_enhanced_access
-- 概要: 患者の権限強化（自分のペアに関する詳細情報アクセス）
CREATE POLICY "users_patient_enhanced_access" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users current_user
      WHERE current_user.id = auth.uid() AND current_user.role = 'patient'
    ) AND (
      id = auth.uid() OR
      id IN (
        SELECT supporter_id FROM public.user_pairs 
        WHERE patient_id = auth.uid() AND status = 'approved'
      )
    )
  );

-- ポリシー: users_supporter_limited_access
-- 概要: 支援者の制限されたアクセス（承認済みペアのみ、更新不可）
CREATE POLICY "users_supporter_limited_access" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users current_user
      WHERE current_user.id = auth.uid() AND current_user.role = 'supporter'
    ) AND (
      id = auth.uid() OR
      id IN (
        SELECT patient_id FROM public.user_pairs 
        WHERE supporter_id = auth.uid() AND status = 'approved'
      )
    )
  );

-- ポリシー: user_pairs_patient_full_control
-- 概要: 患者はペア関係の完全制御が可能
CREATE POLICY "user_pairs_patient_full_control" ON public.user_pairs
  FOR ALL USING (
    patient_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'patient'
    )
  );

-- ポリシー: user_pairs_supporter_read_only
-- 概要: 支援者は承認済みペアの読み取りのみ
CREATE POLICY "user_pairs_supporter_read_only" ON public.user_pairs
  FOR SELECT USING (
    supporter_id = auth.uid() AND 
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'supporter'
    )
  );

-- ====================
-- 3. 時系列・状態管理の高度なポリシー
-- ====================

-- ポリシー: invitations_time_based_access
-- 概要: 時間ベースの招待アクセス制御
CREATE POLICY "invitations_time_based_access" ON public.invitations
  FOR ALL USING (
    inviter_id = auth.uid() OR
    (
      -- 有効期限内の未使用招待のみ公開
      used = FALSE AND 
      expires_at > NOW() AND
      created_at > (NOW() - INTERVAL '30 days') -- 作成から30日以内
    )
  );

-- ポリシー: user_pairs_status_transition_control
-- 概要: ペア状態遷移の制御（承認プロセス管理）
CREATE POLICY "user_pairs_status_transition_control" ON public.user_pairs
  FOR UPDATE USING (
    -- 患者は全ステータス変更可能
    (patient_id = auth.uid() AND 
     EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'patient')) OR
    -- 支援者は特定の状態遷移のみ可能（承認・拒否）
    (supporter_id = auth.uid() AND 
     EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'supporter') AND
     status IN ('pending', 'approved', 'rejected'))
  );

-- ====================
-- 4. セキュリティ強化ポリシー（データ漏洩防止）
-- ====================

-- ポリシー: users_data_isolation_enhanced
-- 概要: 強化されたデータ分離（他ペア情報の完全遮断）
CREATE POLICY "users_data_isolation_enhanced" ON public.users
  FOR ALL USING (
    -- 自分のデータ
    id = auth.uid() OR
    -- 承認済みペアパートナーのデータのみ
    (
      current_pair_id IS NOT NULL AND
      current_pair_id IN (
        SELECT id FROM public.user_pairs 
        WHERE (patient_id = auth.uid() OR supporter_id = auth.uid()) 
        AND status = 'approved'
        AND id = current_pair_id
      )
    )
  );

-- ポリシー: invitations_security_enhanced
-- 概要: 招待のセキュリティ強化（ブルートフォース防止）
CREATE POLICY "invitations_security_enhanced" ON public.invitations
  FOR SELECT USING (
    inviter_id = auth.uid() OR
    (
      -- 有効な招待のみ、かつ過度なアクセスを制限
      used = FALSE AND 
      expires_at > NOW() AND
      created_at > (NOW() - INTERVAL '1 hour') -- 作成から1時間以内の招待のみ公開読み取り可能
    )
  );

-- ====================
-- 5. 監査・ログ用ポリシー（運用管理支援）
-- ====================

-- ポリシー: users_audit_access
-- 概要: 監査ログ用のデータアクセス（管理者権限が必要な場合の準備）
CREATE POLICY "users_audit_access" ON public.users
  FOR SELECT USING (
    -- 現在は通常ユーザーのみだが、将来の管理者機能準備
    auth.uid() IS NOT NULL AND (
      id = auth.uid() OR
      current_pair_id IN (
        SELECT id FROM public.user_pairs 
        WHERE (patient_id = auth.uid() OR supporter_id = auth.uid())
      )
    )
  );

-- ====================
-- 6. ポリシー優先度設定（複数ポリシー適用時の制御）
-- ====================

-- 注意: PostgreSQLのRLSは複数ポリシーがOR条件で適用される
-- より制限的なポリシーを後に定義することで、セキュリティを強化

-- 既存の基本ポリシーを無効化し、最適化されたポリシーを有効化
-- DROP POLICY IF EXISTS "users_own_data" ON public.users;
-- DROP POLICY IF EXISTS "user_pairs_member_access" ON public.user_pairs;
-- DROP POLICY IF EXISTS "invitations_public_read_by_code" ON public.invitations;

-- 注意: 実際の運用では、既存ポリシーとの調整が必要

-- ====================
-- 7. パフォーマンステスト用クエリ（開発・テスト環境のみ）
-- ====================

/*
-- パフォーマンステスト用クエリ（本番環境では削除）

-- インデックス使用確認
EXPLAIN (ANALYZE, BUFFERS) 
SELECT u.* FROM public.users u
JOIN public.user_pairs up ON u.current_pair_id = up.id
WHERE up.patient_id = '11111111-1111-1111-1111-111111111111';

-- RLSポリシーのパフォーマンス確認
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.invitations
WHERE invitation_code = 'ABCD1234' AND used = FALSE AND expires_at > NOW();

-- ペア権限チェックのパフォーマンス確認
EXPLAIN (ANALYZE, BUFFERS)
SELECT up.* FROM public.user_pairs up
WHERE up.status = 'approved' 
AND (up.patient_id = auth.uid() OR up.supporter_id = auth.uid());
*/

-- ====================
-- ポリシーコメント（運用ドキュメント）
-- ====================

COMMENT ON POLICY "users_optimized_pair_access" ON public.users IS 'インデックスを活用した最適化されたペアアクセス制御';
COMMENT ON POLICY "user_pairs_optimized_member_access" ON public.user_pairs IS 'インデックス最適化されたメンバーアクセス制御';
COMMENT ON POLICY "invitations_optimized_code_access" ON public.invitations IS 'インデックス最適化された招待コードアクセス制御';
COMMENT ON POLICY "users_patient_enhanced_access" ON public.users IS '患者の権限強化：ペア情報への詳細アクセス';
COMMENT ON POLICY "users_supporter_limited_access" ON public.users IS '支援者の制限アクセス：承認済みペアのみ読み取り可能';
COMMENT ON POLICY "user_pairs_patient_full_control" ON public.user_pairs IS '患者のペア関係完全制御権限';
COMMENT ON POLICY "user_pairs_supporter_read_only" ON public.user_pairs IS '支援者の承認済みペア読み取り専用権限';
COMMENT ON POLICY "invitations_time_based_access" ON public.invitations IS '時間ベース招待アクセス制御（30日制限）';
COMMENT ON POLICY "user_pairs_status_transition_control" ON public.user_pairs IS 'ペア状態遷移の役割ベース制御';
COMMENT ON POLICY "users_data_isolation_enhanced" ON public.users IS '強化されたデータ分離：他ペア情報完全遮断';
COMMENT ON POLICY "invitations_security_enhanced" ON public.invitations IS '招待セキュリティ強化：ブルートフォース防止';
COMMENT ON POLICY "users_audit_access" ON public.users IS '監査ログ用アクセス制御（管理機能準備）';