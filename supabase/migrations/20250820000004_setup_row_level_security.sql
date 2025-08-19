-- Row Level Security (RLS) ポリシー設定
-- ペアベース権限システムの厳格なアクセス制御

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- users テーブルのRLSポリシー
-- =============================================================================

-- 自分のユーザー情報は常にアクセス可能
CREATE POLICY users_own_data ON users
  FOR ALL USING (auth.uid()::text = id::text);

-- 承認済みペアの相手の基本情報は閲覧可能
CREATE POLICY users_pair_partner_read ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_pairs
      WHERE status = 'approved'
        AND (
          (patient_id::text = auth.uid()::text AND supporter_id::text = users.id::text) OR
          (supporter_id::text = auth.uid()::text AND patient_id::text = users.id::text)
        )
    )
  );

-- =============================================================================
-- user_pairs テーブルのRLSポリシー
-- =============================================================================

-- 自分が関わるペア情報のみアクセス可能
CREATE POLICY user_pairs_own_data ON user_pairs
  FOR ALL USING (
    auth.uid()::text = patient_id::text OR 
    auth.uid()::text = supporter_id::text
  );

-- =============================================================================
-- invitations テーブルのRLSポリシー
-- =============================================================================

-- 自分が招待した招待のみアクセス可能（招待者）
CREATE POLICY invitations_inviter_data ON invitations
  FOR ALL USING (auth.uid()::text = inviter_id::text);

-- 自分宛の招待は閲覧可能（被招待者）
-- ※ 認証前ユーザーは招待を閲覧できないため、別途公開エンドポイントで処理
CREATE POLICY invitations_invitee_read ON invitations
  FOR SELECT USING (
    -- 認証済みユーザーが自分のメールアドレス宛の招待を確認
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
        AND email = invitations.invitee_email
    )
  );

-- =============================================================================
-- 管理者用ポリシー（必要に応じて）
-- =============================================================================

-- サービスロールは全データにアクセス可能（バックエンド処理用）
-- 注意: これはサーバーサイドでのみ使用し、クライアントには公開しない

-- =============================================================================
-- RLS検証用クエリ（コメント）
-- =============================================================================

-- 以下のクエリでRLSが正しく動作することを確認できる：

-- 1. 自分のユーザー情報取得
-- SELECT * FROM users WHERE id = auth.uid();

-- 2. ペア相手の情報取得（承認済みペアの場合のみ）
-- SELECT u.* FROM users u 
-- JOIN user_pairs up ON (up.patient_id = u.id OR up.supporter_id = u.id)
-- WHERE up.status = 'approved' 
--   AND (up.patient_id = auth.uid() OR up.supporter_id = auth.uid())
--   AND u.id != auth.uid();

-- 3. 自分の招待履歴取得
-- SELECT * FROM invitations WHERE inviter_id = auth.uid();

-- 4. 自分宛の招待取得
-- SELECT i.* FROM invitations i
-- JOIN users u ON u.email = i.invitee_email
-- WHERE u.id = auth.uid();

COMMENT ON POLICY users_own_data ON users IS '自分のユーザー情報へのフルアクセス';
COMMENT ON POLICY users_pair_partner_read ON users IS '承認済みペア相手の基本情報閲覧';
COMMENT ON POLICY user_pairs_own_data ON user_pairs IS '自分が関わるペア情報へのアクセス';
COMMENT ON POLICY invitations_inviter_data ON invitations IS '自分が作成した招待へのフルアクセス';
COMMENT ON POLICY invitations_invitee_read ON invitations IS '自分宛招待の閲覧権限';