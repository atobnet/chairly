-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- ENUMS
-- =====================
CREATE TYPE user_role AS ENUM ('consumer', 'hairdresser', 'salon');

-- =====================
-- TABLES
-- =====================

-- Profiles (all users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hairdresser profiles
CREATE TABLE hairdressers (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  instagram_url TEXT,
  area TEXT DEFAULT '東京',
  menus JSONB,
  portfolio_urls TEXT[]
);

-- Salon spaces
CREATE TABLE salons (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL DEFAULT '',
  area TEXT DEFAULT '東京',
  description TEXT,
  price_per_hour INTEGER NOT NULL DEFAULT 0,
  equipment TEXT[],
  images TEXT[]
);

-- Slots (hairdresser or salon)
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hairdresser_id UUID REFERENCES hairdressers(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT slot_owner_check CHECK (
    (hairdresser_id IS NOT NULL AND salon_id IS NULL) OR
    (hairdresser_id IS NULL AND salon_id IS NOT NULL)
  )
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE,
  consumer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  menu TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_slots_hairdresser ON slots(hairdresser_id);
CREATE INDEX idx_slots_salon ON slots(salon_id);
CREATE INDEX idx_slots_date ON slots(date);
CREATE INDEX idx_bookings_consumer ON bookings(consumer_id);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
CREATE INDEX idx_hairdressers_area ON hairdressers(area);
