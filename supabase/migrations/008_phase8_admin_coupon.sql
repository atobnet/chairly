-- Phase 8: Admin権限 + クーポン設定

-- 1. profiles に is_admin カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- is_admin はフロントエンドから直接変更不可（service roleのみ）
-- RLSはprofilesの既存ポリシーで制御済み

-- 2. KeisukeアカウントにAdmin権限付与
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'iwamotokeisukeiw0502@gmail.com'
);

-- 3. coupon_settings テーブル作成
CREATE TABLE IF NOT EXISTS coupon_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_type text NOT NULL,
  is_active boolean DEFAULT false,
  discount_type text NOT NULL DEFAULT 'amount',
  discount_value int NOT NULL DEFAULT 0,
  funding_type text NOT NULL DEFAULT 'chairly',
  expires_days int NOT NULL DEFAULT 90,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coupon_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin only read" ON coupon_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "admin only write" ON coupon_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 初期データ
INSERT INTO coupon_settings (coupon_type, is_active, discount_type, discount_value, funding_type, expires_days)
VALUES
  ('first_time', false, 'amount', 500, 'chairly', 90),
  ('second_time', false, 'amount', 300, 'chairly', 90)
ON CONFLICT DO NOTHING;

-- 4. coupons テーブルにカラム追加
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'amount';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_value int DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS funding_type text DEFAULT 'chairly';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS expires_at timestamptz;
