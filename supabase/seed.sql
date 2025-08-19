-- 開発環境用シードデータ
-- テスト用のサンプルユーザー・ペア・招待データ

-- テストユーザー作成
INSERT INTO users (id, email, role, display_name, phone_number) VALUES
  ('11111111-1111-1111-1111-111111111111', 'patient1@example.com', 'patient', '山田太郎', '090-1234-5678'),
  ('22222222-2222-2222-2222-222222222222', 'supporter1@example.com', 'supporter', '山田花子', '090-8765-4321'),
  ('33333333-3333-3333-3333-333333333333', 'patient2@example.com', 'patient', '佐藤次郎', '080-1111-2222'),
  ('44444444-4444-4444-4444-444444444444', 'supporter2@example.com', 'supporter', '佐藤美咲', '080-3333-4444');

-- テストペア作成（承認済み）
INSERT INTO user_pairs (patient_id, supporter_id, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'approved');

-- テスト招待作成（進行中）
INSERT INTO invitations (inviter_id, invitee_email, token, role, expires_at) VALUES
  ('33333333-3333-3333-3333-333333333333', 'supporter2@example.com', 'test-invitation-token-123456789abcdef', 'supporter', NOW() + INTERVAL '7 days');

-- シードデータの説明
-- 1. patient1@example.com と supporter1@example.com は承認済みペア
-- 2. patient2@example.com は supporter2@example.com を招待中
-- 3. 実際の開発・テストではこれらのデータを使用して動作確認が可能