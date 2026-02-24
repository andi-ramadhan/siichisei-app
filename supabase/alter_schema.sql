-- ============================================
-- SiiChiSei - Schema Update: Profile Fields + Classroom Delete
-- Run in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Add full_name and vocal_type to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vocal_type TEXT CHECK (
  vocal_type IS NULL OR vocal_type IN (
    'Bass', 'Baritone', 'Tenor', 'Counter Tenor',
    'Alto', 'Mezzo Soprano', 'Soprano'
  )
);

-- 2. Allow teachers/admins to delete classrooms they created
CREATE POLICY "Creators can delete classrooms" ON classrooms
  FOR DELETE USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- 3. Allow teachers/admins to delete classroom members
CREATE POLICY "Teachers and admins can remove members" ON classroom_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );
