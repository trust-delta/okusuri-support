-- ペアベース服薬記録システム - データベーススキーマ
-- Feature-based Architecture準拠
-- 生成日時: 2025年08月20日
-- 対象タスク: T002 - データベーススキーマ作成・RLSポリシー設定

-- ====================
-- 1. publicスキーマのテーブル定義
-- ====================

-- usersテーブル: ユーザー基本情報（auth.usersテーブルとの連携）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'supporter')),
  display_name TEXT NOT NULL,
  current_pair_id UUID REFERENCES public.user_pairs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_pairsテーブル: ペア関係管理
CREATE TABLE IF NOT EXISTS public.user_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, supporter_id)
);

-- invitationsテーブル: 招待システム管理
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================
-- 2. インデックス作成（パフォーマンス最適化）
-- ====================

-- usersテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_current_pair_id ON public.users(current_pair_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- user_pairsテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_user_pairs_patient_id ON public.user_pairs(patient_id);
CREATE INDEX IF NOT EXISTS idx_user_pairs_supporter_id ON public.user_pairs(supporter_id);
CREATE INDEX IF NOT EXISTS idx_user_pairs_status ON public.user_pairs(status);

-- invitationsテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON public.invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_used ON public.invitations(used);

-- ====================
-- 3. トリガー関数（updated_at自動更新）
-- ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_pairs_updated_at BEFORE UPDATE ON public.user_pairs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================
-- 4. 外部キー制約の詳細設定
-- ====================

-- user_pairsテーブルの外部キー制約（patient_idとsupporter_idの関係性）
ALTER TABLE public.user_pairs 
ADD CONSTRAINT check_different_users 
CHECK (patient_id != supporter_id);

-- usersテーブルのcurrent_pair_id制約（循環参照対応）
-- 注意: この制約は最初の実装では DEFERRABLE として設定
ALTER TABLE public.users 
ADD CONSTRAINT fk_users_current_pair_id 
FOREIGN KEY (current_pair_id) REFERENCES public.user_pairs(id) 
DEFERRABLE INITIALLY DEFERRED;

-- invitationsテーブルの期限チェック制約
ALTER TABLE public.invitations 
ADD CONSTRAINT check_expires_at_future 
CHECK (expires_at > created_at);

-- ====================
-- 5. 初期データ挿入（開発用）
-- ====================

-- 注意: 本番環境では実行しない
-- これは開発・テスト用のダミーデータ生成スクリプト

-- ダミーユーザー作成（auth.usersテーブルにも対応するデータが必要）
-- INSERT INTO public.users (id, email, role, display_name) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'patient@example.com', 'patient', '患者テスト太郎'),
-- ('00000000-0000-0000-0000-000000000002', 'supporter@example.com', 'supporter', '支援者テスト花子');

-- ====================
-- コメント追加（ドキュメント目的）
-- ====================

COMMENT ON TABLE public.users IS 'ユーザー基本情報テーブル。auth.usersとの1:1関係を維持。';
COMMENT ON TABLE public.user_pairs IS 'ペア関係管理テーブル。患者-支援者の関係性を定義。';
COMMENT ON TABLE public.invitations IS '招待システム管理テーブル。7日間の有効期限付き招待コード。';

COMMENT ON COLUMN public.users.role IS '患者(patient)または支援者(supporter)の役割';
COMMENT ON COLUMN public.users.current_pair_id IS '現在のペア関係ID（NULLの場合は未ペア）';
COMMENT ON COLUMN public.user_pairs.status IS 'ペア状態：pending（申請中）、approved（承認済み）、rejected（拒否済み）';
COMMENT ON COLUMN public.invitations.invitation_code IS '8桁英数字の招待コード（一意制約）';
COMMENT ON COLUMN public.invitations.expires_at IS '招待有効期限（作成から7日間）';
COMMENT ON COLUMN public.invitations.used IS '招待使用済みフラグ';