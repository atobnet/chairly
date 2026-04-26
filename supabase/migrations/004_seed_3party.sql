-- 既存の美容師・サロンIDを取得してデモデータを投入
-- hairdresser_salons: 全美容師を全サロンに登録（デモ用）
INSERT INTO hairdresser_salons (hairdresser_id, salon_id, status)
SELECT h.id AS hairdresser_id, s.id AS salon_id, 'active'
FROM profiles h
CROSS JOIN profiles s
WHERE h.role = 'hairdresser' AND s.role = 'salon'
ON CONFLICT (hairdresser_id, salon_id) DO NOTHING;

-- hairdresser_availability: 今後2週間、各美容師に空き枠を追加
INSERT INTO hairdresser_availability (hairdresser_id, date, start_time, end_time)
SELECT
  p.id,
  gs::date,
  '10:00'::time,
  '18:00'::time
FROM profiles p
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + interval '14 days', interval '1 day') gs
WHERE p.role = 'hairdresser'
  AND EXTRACT(DOW FROM gs) NOT IN (0) -- 日曜除く
ON CONFLICT DO NOTHING;

-- salon_availability: 今後2週間、各サロンに席空き追加
INSERT INTO salon_availability (salon_id, date, start_time, end_time)
SELECT
  p.id,
  gs::date,
  '09:00'::time,
  '20:00'::time
FROM profiles p
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + interval '14 days', interval '1 day') gs
WHERE p.role = 'salon'
ON CONFLICT DO NOTHING;
