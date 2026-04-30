-- =====================
-- 本番化前 セキュリティ・バグ修正
-- =====================

-- ① is_admin 自己昇格を防ぐ Restrictive Policy
-- ユーザーが自分の is_admin を true に変更できないようにする
CREATE POLICY "prevent is_admin self-escalation" ON profiles
  AS RESTRICTIVE
  FOR UPDATE USING (true)
  WITH CHECK (
    is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- ② bookings UPDATE RLS にサロンを追加
-- サロンがキャンセルAPIでステータス更新できるようにする
DROP POLICY IF EXISTS "Allow booking status updates" ON bookings;
CREATE POLICY "Allow booking status updates" ON bookings
  FOR UPDATE USING (
    auth.uid() = consumer_id
    OR EXISTS (
      SELECT 1 FROM hairdresser_availability
      WHERE id = hairdresser_availability_id
        AND hairdresser_id = auth.uid()
    )
    OR auth.uid() = salon_id
  );

-- ③ payment_status CHECK制約に 'authorized' を追加
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'authorized', 'paid', 'refunded', 'partially_refunded'));
