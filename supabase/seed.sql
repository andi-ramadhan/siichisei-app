-- ============================================
-- SiiChiSei - Dummy Seed Data
-- Run AFTER migration.sql in Supabase SQL Editor
-- ============================================
-- NOTE: You must first create these 3 users via Supabase Auth Dashboard
-- (Authentication → Users → Add User) with these emails:
--
--   1. teacher@scs.com  (password: teacher123)
--   2. admin@scs.com    (password: admin123)
--   3. student@scs.com  (password: student123)
--
-- After creating them, copy their UUIDs from the Auth dashboard
-- and replace the placeholders below.
-- ============================================

-- Replace these with actual UUIDs from Supabase Auth Dashboard
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

DO $$
DECLARE
  teacher_id UUID := '43005863-a649-48ef-83eb-d51323f4fe44';
  admin_id   UUID := 'bf4d060e-b481-4dd2-a3cf-40665e91f6e5';
  student_id UUID := '2f8a7308-e64d-4877-9ac5-8bab1c646def';
  classroom_id UUID;
BEGIN

  -- Insert profiles (skip if already exists)
  INSERT INTO profiles (id, email, display_name, role)
  VALUES
    (teacher_id, 'teacher@scs.com', 'Pak Guru', 'teacher'),
    (admin_id, 'admin@scs.com', 'Admin SCS', 'admin'),
    (student_id, 'student@scs.com', 'Budi Santoso', 'student')
  ON CONFLICT (id) DO NOTHING;

  -- Create a classroom
  INSERT INTO classrooms (id, name, description, created_by, invite_code)
  VALUES (
    uuid_generate_v4(),
    'Music Class 101',
    'Beginner music class with karaoke practice',
    teacher_id,
    'MUS101'
  )
  RETURNING id INTO classroom_id;

  -- Add all users as members
  INSERT INTO classroom_members (classroom_id, user_id)
  VALUES
    (classroom_id, teacher_id),
    (classroom_id, admin_id),
    (classroom_id, student_id);

  -- Add a welcome message
  INSERT INTO messages (classroom_id, sender_id, content)
  VALUES
    (classroom_id, teacher_id, 'Welcome to Music Class 101! 🎵'),
    (classroom_id, teacher_id, 'Upload your favorite song to the soundboard and we''ll practice together.'),
    (classroom_id, student_id, 'Hello Pak Guru! Ready to learn! 🎤');

  RAISE NOTICE 'Seed data created successfully!';
END $$;
