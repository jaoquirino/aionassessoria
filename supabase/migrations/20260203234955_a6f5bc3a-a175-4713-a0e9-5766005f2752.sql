-- Fix: Restrict profiles table to team members only
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Team members can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_team_member(auth.uid()));