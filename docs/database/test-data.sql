-- ペアベース服薬記録システム - テストデータ
-- Feature-based Architecture準拠
-- 生成日時: 2025年08月20日
-- 対象タスク: T002 - データベーススキーマ作成・RLSポリシー設定

-- ====================
-- テスト用ダミーデータ
-- ====================

-- 注意: このファイルは開発・テスト環境専用
-- 本番環境では実行しないこと

-- ダミーユーザーデータ（auth.usersテーブルに対応するUUIDを使用）
-- 実際のテストでは、Supabase Auth で作成されたユーザーのUUIDを使用する必要がある

-- テスト用ユーザー情報
-- Patient 1: 患者太郎
-- UUID: 11111111-1111-1111-1111-111111111111
-- Email: patient1@test.com
-- Role: patient

-- Supporter 1: 支援者花子
-- UUID: 22222222-2222-2222-2222-222222222222
-- Email: supporter1@test.com
-- Role: supporter

-- Patient 2: 患者次郎
-- UUID: 33333333-3333-3333-3333-333333333333
-- Email: patient2@test.com
-- Role: patient

-- Supporter 2: 支援者太子
-- UUID: 44444444-4444-4444-4444-444444444444
-- Email: supporter2@test.com
-- Role: supporter

-- ====================
-- usersテーブルのテストデータ
-- ====================

INSERT INTO public.users (id, email, role, display_name) VALUES
-- ペア1（承認済み）
('11111111-1111-1111-1111-111111111111', 'patient1@test.com', 'patient', '患者太郎'),
('22222222-2222-2222-2222-222222222222', 'supporter1@test.com', 'supporter', '支援者花子'),
-- ペア2（申請中）
('33333333-3333-3333-3333-333333333333', 'patient2@test.com', 'patient', '患者次郎'),
('44444444-4444-4444-4444-444444444444', 'supporter2@test.com', 'supporter', '支援者太子'),
-- 単独ユーザー（ペアなし）
('55555555-5555-5555-5555-555555555555', 'single@test.com', 'patient', '単独患者'),
('66666666-6666-6666-6666-666666666666', 'solo@test.com', 'supporter', '単独支援者')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- user_pairsテーブルのテストデータ
-- ====================

INSERT INTO public.user_pairs (id, patient_id, supporter_id, status) VALUES
-- 承認済みペア
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'approved'),
-- 申請中ペア
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'pending'),
-- 拒否されたペア（履歴として残る）
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', 'rejected')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- usersテーブルのcurrent_pair_id更新
-- ====================

UPDATE public.users SET current_pair_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' 
WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

UPDATE public.users SET current_pair_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' 
WHERE id IN ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');

-- ====================
-- invitationsテーブルのテストデータ
-- ====================

INSERT INTO public.invitations (id, inviter_id, invitation_code, expires_at, used) VALUES
-- 有効な招待（未使用）
('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'ABCD1234', NOW() + INTERVAL '5 days', FALSE),
-- 期限切れの招待
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'EXPIRED1', NOW() - INTERVAL '1 day', FALSE),
-- 使用済みの招待
('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'USED1234', NOW() + INTERVAL '3 days', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ====================
-- テストシナリオ用コメント
-- ====================

/*
テストシナリオ:

1. RLS権限分離テスト:
   - ユーザー11111111（患者太郎）は自分とペアパートナー（支援者花子）のデータにアクセス可能
   - ユーザー11111111（患者太郎）は他のペア（患者次郎・支援者太子）のデータにアクセス不可
   - ユーザー22222222（支援者花子）は自分とペアパートナー（患者太郎）のデータに読み取りアクセス可能
   - ユーザー22222222（支援者花子）は患者太郎のデータを更新不可

2. テーブル制約テスト:
   - 同じuser_id（patient_idとsupporter_id）でペア作成不可
   - 外部キー制約（存在しないユーザーIDでの操作不可）
   - 招待コードの一意制約テスト

3. 期限・状態管理テスト:
   - 期限切れ招待への新規アクセス不可
   - 使用済み招待への重複使用不可
   - ペア状態遷移の適切性確認
*/