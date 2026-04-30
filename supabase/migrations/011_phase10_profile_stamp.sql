-- Phase 10: プロフィール強化・スタンプカード

-- 1. 得意分野タグ
ALTER TABLE hairdressers ADD COLUMN IF NOT EXISTS specialty_tags text[] DEFAULT '{}';

-- 2. レビューにメニュー名・来店回数
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS menu_name text DEFAULT '';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS visit_count text DEFAULT 'first';

-- 3. サロン内装写真ギャラリー
ALTER TABLE salons ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}';

-- 4. サロン営業時間
ALTER TABLE salons ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{}';

-- 5. プロフィールに性別・生年（ステータス集計用）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year int;

-- 6. スタンプカード設定（美容師ごと）
CREATE TABLE IF NOT EXISTS stamp_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hairdresser_id uuid REFERENCES hairdressers(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  stamps_required integer DEFAULT 10,
  reward_description text DEFAULT '',
  card_design text DEFAULT 'design_1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(hairdresser_id)
);

-- 7. ゲストのスタンプ（美容師ごとに管理）
CREATE TABLE IF NOT EXISTS guest_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  hairdresser_id uuid REFERENCES hairdressers(id) ON DELETE CASCADE,
  stamp_count integer DEFAULT 0,
  total_stamps integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guest_id, hairdresser_id)
);

-- 8. スタンプ履歴
CREATE TABLE IF NOT EXISTS stamp_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid REFERENCES profiles(id),
  hairdresser_id uuid REFERENCES hairdressers(id),
  booking_id uuid REFERENCES bookings(id),
  action text DEFAULT 'earn',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stamp cards" ON stamp_cards
  FOR SELECT USING (true);

CREATE POLICY "Hairdresser manages own stamp card" ON stamp_cards
  FOR ALL USING (hairdresser_id = auth.uid());

CREATE POLICY "Guest views own stamps" ON guest_stamps
  FOR SELECT USING (guest_id = auth.uid());

-- service role は RLS をバイパスするため、スタンプ付与はwebhookで行う

-- salon-gallery storage policies
CREATE POLICY "salon upload own gallery" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'salon-gallery' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "salon delete own gallery" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'salon-gallery' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "public read salon gallery" ON storage.objects
  FOR SELECT USING (bucket_id = 'salon-gallery');
