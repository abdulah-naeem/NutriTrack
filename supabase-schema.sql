-- ============================================
-- NutriTrack — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor
-- ============================================

-- ==========================================
-- 1. User Profiles (extends auth.users)
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT DEFAULT '',
  age INTEGER DEFAULT 25,
  weight REAL DEFAULT 70,        -- kg
  height REAL DEFAULT 170,       -- cm
  gender TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  activity_level TEXT DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'veryActive')),
  goal_type TEXT DEFAULT 'maintain' CHECK (goal_type IN ('lose', 'maintain', 'gain')),
  calorie_goal INTEGER DEFAULT 2000,
  protein_goal INTEGER DEFAULT 150,
  carbs_goal INTEGER DEFAULT 250,
  fat_goal INTEGER DEFAULT 65,
  water_goal INTEGER DEFAULT 8,  -- glasses per day
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. Food Log Entries
-- ==========================================
CREATE TABLE IF NOT EXISTS food_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN (
    'breakfast', 'morningSnack', 'lunch', 'afternoonSnack',
    'dinner', 'eveningSnack', 'beverages'
  )),
  name TEXT NOT NULL,
  calories REAL DEFAULT 0,
  protein_g REAL DEFAULT 0,
  carbohydrates_total_g REAL DEFAULT 0,
  fat_total_g REAL DEFAULT 0,
  serving_size_g REAL DEFAULT 100,
  fiber_g REAL DEFAULT 0,
  sugar_g REAL DEFAULT 0,
  sodium_mg REAL DEFAULT 0,
  fat_saturated_g REAL DEFAULT 0,
  potassium_mg REAL DEFAULT 0,
  cholesterol_mg REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast daily lookups
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, date);

-- ==========================================
-- 3. Water Tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS water_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ==========================================
-- 4. Row Level Security (RLS)
-- ==========================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Food Entries
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food entries"
  ON food_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food entries"
  ON food_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own food entries"
  ON food_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own food entries"
  ON food_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Water Entries
ALTER TABLE water_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water entries"
  ON water_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water entries"
  ON water_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water entries"
  ON water_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- ==========================================
-- 4.5. Sleep Tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS sleep_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours REAL DEFAULT 0,
  quality TEXT DEFAULT 'good' CHECK (quality IN ('poor', 'fair', 'good', 'excellent')),
  UNIQUE(user_id, date)
);

ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sleep entries"
  ON sleep_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sleep entries"
  ON sleep_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep entries"
  ON sleep_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. Auto-create profile on signup (trigger)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    name, 
    age, 
    weight, 
    height, 
    gender, 
    activity_level, 
    goal_type,
    calorie_goal,
    protein_goal,
    carbs_goal,
    fat_goal
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'age')::integer, 25),
    COALESCE((NEW.raw_user_meta_data->>'weight')::real, 70),
    COALESCE((NEW.raw_user_meta_data->>'height')::real, 170),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'male'),
    COALESCE(NEW.raw_user_meta_data->>'activity_level', 'moderate'),
    COALESCE(NEW.raw_user_meta_data->>'goal_type', 'maintain'),
    COALESCE((NEW.raw_user_meta_data->>'calorie_goal')::integer, 2000),
    COALESCE((NEW.raw_user_meta_data->>'protein_goal')::integer, 150),
    COALESCE((NEW.raw_user_meta_data->>'carbs_goal')::integer, 250),
    COALESCE((NEW.raw_user_meta_data->>'fat_goal')::integer, 65)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 6. Sync existing auth.users with public.profiles
-- ==========================================
INSERT INTO public.profiles (id, name, age, weight, height, gender, activity_level, goal_type)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', ''), 
  25, 70, 170, 'male', 'moderate', 'maintain'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
