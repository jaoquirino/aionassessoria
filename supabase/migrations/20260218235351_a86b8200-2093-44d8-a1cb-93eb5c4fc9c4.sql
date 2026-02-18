-- Add restricted_view column to team_members
ALTER TABLE public.team_members 
ADD COLUMN restricted_view boolean NOT NULL DEFAULT false;

-- Update team_members_public view to include the new column
DROP VIEW IF EXISTS public.team_members_public;
CREATE VIEW public.team_members_public 
WITH (security_invoker=on) AS
  SELECT id, name, role, permission, avatar_url, capacity_limit, is_active, created_at, updated_at, restricted_view
  FROM public.team_members;
