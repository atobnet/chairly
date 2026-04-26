-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdressers ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- =====================
-- PROFILES
-- =====================
-- Anyone can read public profiles
CREATE POLICY "Profiles are publicly readable" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================
-- HAIRDRESSERS
-- =====================
CREATE POLICY "Hairdressers are publicly readable" ON hairdressers
  FOR SELECT USING (true);

CREATE POLICY "Hairdressers can update own profile" ON hairdressers
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Hairdressers can insert own profile" ON hairdressers
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================
-- SALONS
-- =====================
CREATE POLICY "Salons are publicly readable" ON salons
  FOR SELECT USING (true);

CREATE POLICY "Salons can update own profile" ON salons
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Salons can insert own profile" ON salons
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================
-- SLOTS
-- =====================
-- Anyone can read slots
CREATE POLICY "Slots are publicly readable" ON slots
  FOR SELECT USING (true);

-- Hairdressers can manage their own slots
CREATE POLICY "Hairdressers can manage own slots" ON slots
  FOR ALL USING (
    auth.uid() = hairdresser_id OR
    auth.uid() = salon_id
  );

-- Hairdressers/salons can insert slots
CREATE POLICY "Authenticated users can insert slots" ON slots
  FOR INSERT WITH CHECK (
    auth.uid() = hairdresser_id OR
    auth.uid() = salon_id
  );

-- Allow status updates (for booking flow - consumer books a slot)
CREATE POLICY "Allow slot status updates" ON slots
  FOR UPDATE USING (
    auth.uid() = hairdresser_id OR
    auth.uid() = salon_id OR
    -- Allow consumers to update status when booking
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'consumer'
    )
  );

-- =====================
-- BOOKINGS
-- =====================
-- Consumers can read their own bookings
CREATE POLICY "Consumers can read own bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = consumer_id OR
    -- Hairdressers can see bookings for their slots
    EXISTS (
      SELECT 1 FROM slots
      WHERE slots.id = slot_id AND slots.hairdresser_id = auth.uid()
    ) OR
    -- Salons can see bookings for their slots
    EXISTS (
      SELECT 1 FROM slots
      WHERE slots.id = slot_id AND slots.salon_id = auth.uid()
    )
  );

-- Consumers can insert bookings
CREATE POLICY "Consumers can insert bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = consumer_id);

-- Allow status updates (hairdressers confirm/cancel, consumers cancel)
CREATE POLICY "Allow booking status updates" ON bookings
  FOR UPDATE USING (
    auth.uid() = consumer_id OR
    EXISTS (
      SELECT 1 FROM slots
      WHERE slots.id = slot_id AND slots.hairdresser_id = auth.uid()
    )
  );
