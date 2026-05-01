-- =====================
-- 退会機能: アカウント退会管理
-- =====================

-- profiles に deleted_at カラム追加（ソフトデリート用）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 退会済みユーザーを他のユーザーから隠す（本人は自分のプロフィールを見られる）
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
CREATE POLICY "Profiles are publicly readable" ON profiles
  FOR SELECT USING (deleted_at IS NULL OR auth.uid() = id);

-- バッチ処理（ハードデリートcron）用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;
