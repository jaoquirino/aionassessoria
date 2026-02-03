-- Create a public view without sensitive email field
CREATE OR REPLACE VIEW public.team_members_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  role,
  permission,
  avatar_url,
  is_active,
  capacity_limit,
  created_at,
  updated_at
FROM public.team_members;

-- Update SELECT policy: only admins can see full table (including email)
DROP POLICY IF EXISTS "Team members can view team_members" ON public.team_members;

CREATE POLICY "Admins can view all team_members" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Team members can view the public view (without email)
-- Views inherit RLS from base table, so we need a policy for non-admins to access via view
CREATE POLICY "Team members can view own record" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);