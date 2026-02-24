-- ============================================
-- SiiChiSei Voice Teaching Classroom - DB Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create enum for user roles
CREATE TYPE user_role AS ENUM ('teacher', 'admin', 'student');

-- 3. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  is_call_active BOOLEAN NOT NULL DEFAULT FALSE,
  call_channel_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Classroom members (join table)
CREATE TABLE IF NOT EXISTS classroom_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(classroom_id, user_id)
);

-- 6. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_classroom_id ON messages(classroom_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_classroom_members_user_id ON classroom_members(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom_id ON classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON message_read_receipts(message_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Classrooms, classroom_members, and messages use a SECURITY DEFINER
-- helper to check membership without causing infinite recursion.
CREATE OR REPLACE FUNCTION is_classroom_member(p_classroom_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classroom_members
    WHERE classroom_id = p_classroom_id
    AND user_id = p_user_id
  );
$$;

-- Classrooms: members can read, teachers/admins can create/update
CREATE POLICY "Classroom members can view classrooms" ON classrooms
  FOR SELECT USING (
    is_classroom_member(id, auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Teachers and admins can create classrooms" ON classrooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can update classrooms" ON classrooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Classroom members: viewable by co-members, manageable by teachers/admins
CREATE POLICY "Members can view classroom members" ON classroom_members
  FOR SELECT USING (
    is_classroom_member(classroom_id, auth.uid())
  );

CREATE POLICY "Teachers and admins can manage members" ON classroom_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
    OR user_id = auth.uid()
  );

-- Messages: members can read and send
CREATE POLICY "Classroom members can view messages" ON messages
  FOR SELECT USING (
    is_classroom_member(classroom_id, auth.uid())
  );

CREATE POLICY "Classroom members can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_classroom_member(classroom_id, auth.uid())
  );

-- Read receipts: members can read and create
CREATE POLICY "Members can view read receipts" ON message_read_receipts
  FOR SELECT USING (true);

CREATE POLICY "Users can mark messages as read" ON message_read_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update read receipts" ON message_read_receipts
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Enable Realtime
-- ============================================

-- Enable realtime for messages and classrooms
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE classrooms;
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;
