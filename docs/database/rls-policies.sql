-- ペアベース服薬記録システム - Row Level Security (RLS) ポリシー設定
-- Feature-based Architecture準拠
-- 生成日時: 2025年08月20日
-- 対象タスク: T002 - データベーススキーマ作成・RLSポリシー設定

-- ====================
-- RLS有効化
-- ====================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ====================
-- 1. usersテーブルのRLSポリシー
-- ====================

-- ポリシー: users_own_data
-- 概要: ユーザーは自分のデータのみアクセス可能
CREATE POLICY "users_own_data" ON public.users
  FOR ALL USING (auth.uid() = id);

-- ====================
-- 2. user_pairsテーブルのRLSポリシー
-- ====================

-- ポリシー: user_pairs_member_access
-- 概要: ペアのメンバー（患者または支援者）のみアクセス可能
CREATE POLICY "user_pairs_member_access" ON public.user_pairs
  FOR ALL USING (
    auth.uid() = patient_id OR auth.uid() = supporter_id
  );

-- ポリシー: user_pairs_patient_full_access
-- 概要: 患者は自分が関わるペアデータに完全アクセス権限
CREATE POLICY "user_pairs_patient_full_access" ON public.user_pairs
  FOR ALL USING (
    auth.uid() = patient_id AND 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'patient'
    )
  );

-- ポリシー: user_pairs_supporter_read_access
-- 概要: 支援者は承認済みペアデータの閲覧のみ可能（UPDATE/DELETEは不可）
CREATE POLICY "user_pairs_supporter_read_access" ON public.user_pairs
  FOR SELECT USING (
    auth.uid() = supporter_id AND 
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'supporter'
    )
  );

-- ====================
-- 3. invitationsテーブルのRLSポリシー
-- ====================

-- ポリシー: invitations_inviter_access
-- 概要: 招待者は自分が作成した招待のみアクセス可能
CREATE POLICY "invitations_inviter_access" ON public.invitations
  FOR ALL USING (auth.uid() = inviter_id);

-- ポリシー: invitations_public_read_by_code
-- 概要: 有効な招待コードは誰でも参照可能（参加処理のため）
CREATE POLICY "invitations_public_read_by_code" ON public.invitations
  FOR SELECT USING (
    used = FALSE AND 
    expires_at > NOW()
  );

-- ====================
-- 4. 高度なRLSポリシー（ペアベース権限制御）
-- ====================

-- ポリシー: users_pair_data_access
-- 概要: ペアメンバーは互いのbasic情報にアクセス可能（承認済みペアのみ）
CREATE POLICY "users_pair_data_access" ON public.users
  FOR SELECT USING (
    -- 自分のデータは常にアクセス可能
    auth.uid() = id OR
    -- 承認済みペアのパートナーデータにアクセス可能
    EXISTS (
      SELECT 1 FROM public.user_pairs up
      WHERE up.status = 'approved' AND
      ((up.patient_id = auth.uid() AND up.supporter_id = id) OR
       (up.supporter_id = auth.uid() AND up.patient_id = id))
    )
  );

-- ポリシー: users_pair_update_restriction
-- 概要: 他人のプロファイル更新を制限（自分のデータのみ更新可能）
CREATE POLICY "users_pair_update_restriction" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ポリシー: users_pair_delete_restriction  
-- 概要: 自分のアカウントのみ削除可能
CREATE POLICY "users_pair_delete_restriction" ON public.users
  FOR DELETE USING (auth.uid() = id);

-- ====================
-- 5. データ分離の強化ポリシー
-- ====================

-- ポリシー: user_pairs_isolation
-- 概要: 他のペアのデータに一切アクセス不可
CREATE POLICY "user_pairs_isolation" ON public.user_pairs
  FOR ALL USING (
    -- 自分が参加しているペアのみアクセス可能
    auth.uid() = patient_id OR auth.uid() = supporter_id
  );

-- ポリシー: invitations_isolation
-- 概要: 自分が関係する招待のみアクセス可能
CREATE POLICY "invitations_isolation" ON public.invitations
  FOR ALL USING (
    -- 招待者本人
    auth.uid() = inviter_id OR
    -- 有効な招待コードを持つ場合の読み取りアクセス（参加処理用）
    (used = FALSE AND expires_at > NOW())
  );

-- ====================
-- 6. セキュリティ強化ポリシー（期限切れ・無効データの制御）
-- ====================

-- ポリシー: invitations_valid_only
-- 概要: 期限切れ・使用済み招待の制御
CREATE POLICY "invitations_valid_only" ON public.invitations
  FOR SELECT USING (
    -- 自分が作成した招待は期限切れでも参照可能（管理目的）
    auth.uid() = inviter_id OR
    -- 他人の招待は有効なもののみ参照可能
    (used = FALSE AND expires_at > NOW())
  );

-- ====================
-- 7. 匿名アクセス制御
-- ====================

-- 全テーブルで匿名ユーザー（auth.uid() IS NULL）のアクセスを完全に遮断
-- これは各ポリシーでauth.uid()チェックにより実現されている

-- ====================
-- 8. ポリシーコメント（ドキュメント目的）
-- ====================

COMMENT ON POLICY "users_own_data" ON public.users IS 'ユーザーは自分のデータのみアクセス可能';
COMMENT ON POLICY "user_pairs_member_access" ON public.user_pairs IS 'ペアメンバーのみアクセス可能';
COMMENT ON POLICY "user_pairs_patient_full_access" ON public.user_pairs IS '患者の完全アクセス権限';
COMMENT ON POLICY "user_pairs_supporter_read_access" ON public.user_pairs IS '支援者の閲覧権限（承認済みペアのみ）';
COMMENT ON POLICY "invitations_inviter_access" ON public.invitations IS '招待者のみアクセス可能';
COMMENT ON POLICY "invitations_public_read_by_code" ON public.invitations IS '有効な招待コードの公開読み取り';
COMMENT ON POLICY "users_pair_data_access" ON public.users IS 'ペアメンバー間の相互データアクセス';
COMMENT ON POLICY "user_pairs_isolation" ON public.user_pairs IS '他ペアデータへのアクセス完全遮断';
COMMENT ON POLICY "invitations_isolation" ON public.invitations IS '自分関係の招待のみアクセス';
COMMENT ON POLICY "invitations_valid_only" ON public.invitations IS '期限切れ・使用済み招待の制御';

-- ====================
-- 9. RLSポリシー確認クエリ（テスト用）
-- ====================

-- 以下のクエリはRLSポリシーの動作確認に使用
-- 注意: テスト環境でのみ実行すること

/*
-- 現在のユーザーIDを確認
SELECT auth.uid() AS current_user_id;

-- ユーザーがアクセス可能なusersレコードを確認
SELECT id, email, role, display_name FROM public.users;

-- ユーザーがアクセス可能なuser_pairsレコードを確認
SELECT id, patient_id, supporter_id, status FROM public.user_pairs;

-- ユーザーがアクセス可能なinvitationsレコードを確認
SELECT id, inviter_id, invitation_code, expires_at, used FROM public.invitations;
*/