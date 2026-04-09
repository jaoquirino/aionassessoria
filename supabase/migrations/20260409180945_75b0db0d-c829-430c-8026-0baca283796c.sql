-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Team members can view team_members" ON public.team_members;

-- Recreate: any authenticated team member can view all team members
CREATE POLICY "Team members can view team_members" 
ON public.team_members 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR is_team_member(auth.uid()) 
    OR user_id = auth.uid()
  )
);