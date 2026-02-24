-- ============================================
-- FIX: Infinite recursion in classroom_members RLS
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Step 1: Drop the recursive policies
DROP POLICY IF EXISTS "Members can view classroom members" ON classroom_members;
DROP POLICY IF EXISTS "Classroom members can view classrooms" ON classrooms;
DROP POLICY IF EXISTS "Classroom members can view messages" ON messages;
DROP POLICY IF EXISTS "Classroom members can send messages" ON messages;

-- Step 2: Create a SECURITY DEFINER helper function
-- This bypasses RLS when checking membership, breaking the recursion cycle
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

-- Step 3: Recreate policies using the helper function (no recursion)

-- classroom_members: simply check if this row belongs to the current user
-- (a user can see all members in classrooms they belong to)
CREATE POLICY "Members can view classroom members" ON classroom_members
  FOR SELECT USING (
    is_classroom_member(classroom_id, auth.uid())
  );

-- classrooms: use the helper to check membership
CREATE POLICY "Classroom members can view classrooms" ON classrooms
  FOR SELECT USING (
    is_classroom_member(id, auth.uid())
    OR created_by = auth.uid()
  );

-- messages: use the helper to check membership
CREATE POLICY "Classroom members can view messages" ON messages
  FOR SELECT USING (
    is_classroom_member(classroom_id, auth.uid())
  );

CREATE POLICY "Classroom members can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_classroom_member(classroom_id, auth.uid())
  );
