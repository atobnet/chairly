-- bookings RLSを新スキーマ（hairdresser_availability_id）に対応させる

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Consumers can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Allow booking status updates" ON bookings;

-- 新しい SELECT ポリシー（hairdresser_availability_id 経由も許可）
CREATE POLICY "Consumers can read own bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = consumer_id
    OR EXISTS (
      SELECT 1 FROM slots
      WHERE slots.id = slot_id AND slots.hairdresser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM hairdresser_availability
      WHERE hairdresser_availability.id = hairdresser_availability_id
        AND hairdresser_availability.hairdresser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM slots
      WHERE slots.id = slot_id AND slots.salon_id = auth.uid()
    )
    OR auth.uid() = salon_id
  );

-- 新しい UPDATE ポリシー
CREATE POLICY "Allow booking status updates" ON bookings
  FOR UPDATE USING (
    auth.uid() = consumer_id
    OR EXISTS (
      SELECT 1 FROM slots
      WHERE slots.id = slot_id AND slots.hairdresser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM hairdresser_availability
      WHERE hairdresser_availability.id = hairdresser_availability_id
        AND hairdresser_availability.hairdresser_id = auth.uid()
    )
  );
