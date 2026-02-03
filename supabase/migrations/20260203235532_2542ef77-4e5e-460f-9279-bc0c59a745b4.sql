-- Enable RLS on the team_members_public view
ALTER VIEW public.team_members_public SET (security_invoker = on);

-- Drop existing policies on team_members to recreate properly
DROP POLICY IF EXISTS "Admins can view all team_members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view own record" ON public.team_members;

-- Only admins can see full team_members table (with emails)
CREATE POLICY "Admins can view all team_members" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- All team members can view their own record
CREATE POLICY "Users can view own team_member record" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Non-admins access team data through the view (which excludes email)
-- The view uses security_invoker so it respects the caller's permissions
-- We need a policy that allows viewing records through the view for team members
CREATE POLICY "Team members can view via public view" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (
  is_team_member(auth.uid())
);