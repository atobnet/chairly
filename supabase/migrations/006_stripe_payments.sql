-- =====================
-- Stripe 決済スキーマ追加
-- =====================

-- bookingsに決済カラム追加
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partially_refunded'));

-- profilesにStripe Connect IDカラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- キャンセル警告テーブル
CREATE TABLE IF NOT EXISTS cancel_warnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cancel_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON cancel_warnings
  USING (false);

-- クーポンテーブル
CREATE TABLE IF NOT EXISTS coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL DEFAULT 'CHAIR-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  discount_rate int NOT NULL DEFAULT 10,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own coupons" ON coupons
  FOR SELECT USING (auth.uid() = user_id);

-- 警告カウントRPC
CREATE OR REPLACE FUNCTION add_cancel_warning(
  p_user_id uuid,
  p_booking_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  monthly_count int;
  total_count int;
BEGIN
  INSERT INTO cancel_warnings (user_id, booking_id, reason)
  VALUES (p_user_id, p_booking_id, p_reason);

  SELECT COUNT(*) INTO monthly_count
  FROM cancel_warnings
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', now());

  SELECT COUNT(*) INTO total_count
  FROM cancel_warnings
  WHERE user_id = p_user_id;

  IF (p_reason = 'hairdresser' AND monthly_count >= 3)
  OR (p_reason = 'salon' AND monthly_count >= 2)
  OR total_count >= 10 THEN
    UPDATE hairdresser_salons SET status = 'inactive'
    WHERE hairdresser_id = p_user_id OR salon_id = p_user_id;
  END IF;
END;
$$;
