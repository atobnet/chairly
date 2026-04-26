-- hairdresser_salons: 美容師↔サロン登録
CREATE TABLE IF NOT EXISTS hairdresser_salons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hairdresser_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  salon_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(hairdresser_id, salon_id)
);

ALTER TABLE hairdresser_salons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hairdresser can manage own" ON hairdresser_salons
  FOR ALL USING (auth.uid() = hairdresser_id);
CREATE POLICY "public read hairdresser_salons" ON hairdresser_salons
  FOR SELECT USING (true);

-- hairdresser_availability: 美容師の空き時間
CREATE TABLE IF NOT EXISTS hairdresser_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hairdresser_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hairdresser_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hairdresser can manage own availability" ON hairdresser_availability
  FOR ALL USING (auth.uid() = hairdresser_id);
CREATE POLICY "public read hairdresser_availability" ON hairdresser_availability
  FOR SELECT USING (true);

-- salon_availability: サロンの席空き
CREATE TABLE IF NOT EXISTS salon_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE salon_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salon can manage own availability" ON salon_availability
  FOR ALL USING (auth.uid() = salon_id);
CREATE POLICY "public read salon_availability" ON salon_availability
  FOR SELECT USING (true);

-- salons: 座標カラム追加
ALTER TABLE salons ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS lng double precision;

-- bookings: 新フィールド追加
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hairdresser_availability_id uuid REFERENCES hairdresser_availability(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS salon_availability_id uuid REFERENCES salon_availability(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS salon_id uuid REFERENCES profiles(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booked_date date;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booked_start_time time;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booked_end_time time;

-- available_slots VIEW: 予約可能枠の自動計算
CREATE OR REPLACE VIEW available_slots AS
SELECT
  ha.id AS hairdresser_availability_id,
  sa.id AS salon_availability_id,
  ha.hairdresser_id,
  sa.salon_id,
  ha.date,
  GREATEST(ha.start_time, sa.start_time) AS available_from,
  LEAST(ha.end_time, sa.end_time) AS available_until,
  hs.id AS hairdresser_salon_id
FROM hairdresser_availability ha
JOIN hairdresser_salons hs ON hs.hairdresser_id = ha.hairdresser_id AND hs.status = 'active'
JOIN salon_availability sa ON sa.salon_id = hs.salon_id AND sa.date = ha.date
WHERE
  ha.start_time < sa.end_time
  AND ha.end_time > sa.start_time
  AND ha.date >= CURRENT_DATE;

-- anon / authenticated ロールへの権限付与
GRANT SELECT ON hairdresser_salons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hairdresser_salons TO authenticated;
GRANT SELECT ON hairdresser_availability TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hairdresser_availability TO authenticated;
GRANT SELECT ON salon_availability TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON salon_availability TO authenticated;
GRANT SELECT ON available_slots TO anon, authenticated;

-- デモ用サロン座標設定
UPDATE salons SET lat = 35.6653, lng = 139.7064 WHERE area = '渋谷区' AND lat IS NULL;
UPDATE salons SET lat = 35.6896, lng = 139.6917 WHERE area = '新宿区' AND lat IS NULL;
UPDATE salons SET lat = 35.6654, lng = 139.7315 WHERE area = '港区' AND lat IS NULL;
UPDATE salons SET lat = 35.6762, lng = 139.6503 WHERE area = '世田谷区' AND lat IS NULL;
UPDATE salons SET lat = 35.7295, lng = 139.7109 WHERE area = '豊島区' AND lat IS NULL;
