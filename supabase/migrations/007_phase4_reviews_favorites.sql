-- Phase 4: レビュー・お気に入りテーブル

-- reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  hairdresser_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consumer can write own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "public read reviews" ON reviews
  FOR SELECT USING (true);

-- favorites
CREATE TABLE IF NOT EXISTS favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  hairdresser_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(consumer_id, hairdresser_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consumer manage own" ON favorites
  FOR ALL USING (auth.uid() = consumer_id);
CREATE POLICY "public read count" ON favorites
  FOR SELECT USING (true);

-- Storage: portfolio バケット用RLSポリシー（バケット自体はDashboardで作成）
CREATE POLICY "hairdresser upload own portfolio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "hairdresser delete own portfolio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "public read portfolio" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio');
