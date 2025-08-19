-- invitationsテーブル作成
-- 双方向招待システムの招待情報を管理

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired');

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- 制約
  CONSTRAINT check_future_expiry CHECK (expires_at > created_at)
);

-- インデックス作成
CREATE INDEX idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);

-- 期限切れ招待の自動更新関数
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ビジネスルール検証トリガー
CREATE OR REPLACE FUNCTION validate_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- 招待者の既存ペア状態チェック
  IF EXISTS (
    SELECT 1 FROM user_pairs 
    WHERE (patient_id = NEW.inviter_id OR supporter_id = NEW.inviter_id)
      AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Inviter already has an approved pair';
  END IF;

  -- 重複招待チェック（同じ招待者・被招待者・ロールの組み合わせ）
  IF EXISTS (
    SELECT 1 FROM invitations 
    WHERE inviter_id = NEW.inviter_id 
      AND invitee_email = NEW.invitee_email 
      AND role = NEW.role 
      AND status = 'pending'
      AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'Duplicate invitation already exists for this email and role';
  END IF;

  -- 招待トークン生成（INSERTのみ）
  IF TG_OP = 'INSERT' AND NEW.token IS NULL THEN
    NEW.token = encode(gen_random_bytes(32), 'hex');
  END IF;

  -- デフォルト有効期限設定（7日間）
  IF TG_OP = 'INSERT' AND NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '7 days';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_invitation
  BEFORE INSERT OR UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation();

-- 定期的な期限切れ処理のためのSQL（手動実行用）
-- SELECT expire_old_invitations();

-- テーブルコメント
COMMENT ON TABLE invitations IS '双方向招待システムの招待情報';
COMMENT ON COLUMN invitations.id IS '招待ID（UUID）';
COMMENT ON COLUMN invitations.inviter_id IS '招待者ID';
COMMENT ON COLUMN invitations.invitee_email IS '被招待者メールアドレス';
COMMENT ON COLUMN invitations.token IS '招待トークン（URL用）';
COMMENT ON COLUMN invitations.role IS '招待先ロール（patient: 患者として招待, supporter: 支援者として招待）';
COMMENT ON COLUMN invitations.status IS '招待状態（pending: 招待中, accepted: 承諾済み, expired: 期限切れ）';
COMMENT ON COLUMN invitations.expires_at IS '招待有効期限';
COMMENT ON COLUMN invitations.created_at IS '招待作成日時';