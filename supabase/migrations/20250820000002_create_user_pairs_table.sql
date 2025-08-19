-- user_pairsテーブル作成
-- 患者と支援者の1対1ペア関係を管理

CREATE TYPE pair_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE user_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status pair_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- 制約
  CONSTRAINT unique_patient_supporter_pair UNIQUE (patient_id, supporter_id),
  CONSTRAINT check_different_users CHECK (patient_id != supporter_id)
);

-- インデックス作成
CREATE INDEX idx_user_pairs_patient_id ON user_pairs(patient_id);
CREATE INDEX idx_user_pairs_supporter_id ON user_pairs(supporter_id);
CREATE INDEX idx_user_pairs_status ON user_pairs(status);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_user_pairs_updated_at
  BEFORE UPDATE ON user_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ビジネスルール検証トリガー
CREATE OR REPLACE FUNCTION validate_user_pair()
RETURNS TRIGGER AS $$
BEGIN
  -- 患者ロールのチェック
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.patient_id AND role = 'patient'
  ) THEN
    RAISE EXCEPTION 'patient_id must reference a user with role patient';
  END IF;

  -- 支援者ロールのチェック
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.supporter_id AND role = 'supporter'
  ) THEN
    RAISE EXCEPTION 'supporter_id must reference a user with role supporter';
  END IF;

  -- 1対1制約のチェック（患者側）
  IF EXISTS (
    SELECT 1 FROM user_pairs 
    WHERE patient_id = NEW.patient_id 
      AND status = 'approved' 
      AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'Patient can only have one approved pair';
  END IF;

  -- 1対1制約のチェック（支援者側）
  IF EXISTS (
    SELECT 1 FROM user_pairs 
    WHERE supporter_id = NEW.supporter_id 
      AND status = 'approved' 
      AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'Supporter can only have one approved pair';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_user_pair
  BEFORE INSERT OR UPDATE ON user_pairs
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_pair();

-- テーブルコメント
COMMENT ON TABLE user_pairs IS '患者・支援者の1対1ペア関係';
COMMENT ON COLUMN user_pairs.id IS 'ペアID（UUID）';
COMMENT ON COLUMN user_pairs.patient_id IS '患者ID';
COMMENT ON COLUMN user_pairs.supporter_id IS '支援者ID';
COMMENT ON COLUMN user_pairs.status IS 'ペア状態（pending: 申請中, approved: 承認済み, rejected: 拒否）';
COMMENT ON COLUMN user_pairs.created_at IS '作成日時';
COMMENT ON COLUMN user_pairs.updated_at IS '更新日時';