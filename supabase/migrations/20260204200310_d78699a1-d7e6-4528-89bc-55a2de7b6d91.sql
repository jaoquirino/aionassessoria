-- Fix team_members RLS policy to not access auth.users directly
-- This fixes the "permission denied for table users" error

DROP POLICY IF EXISTS "Authenticated users can view team_members" ON public.team_members;

-- Create a simple policy that allows team members to view all team members
-- Admins and team members can view, no need to check email against auth.users
CREATE POLICY "Team members can view team_members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  is_team_member(auth.uid()) OR
  user_id = auth.uid()
);