-- Recriar a view team_members_public com security_invoker para herdar RLS da tabela base
DROP VIEW IF EXISTS public.team_members_public;

CREATE VIEW public.team_members_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    role,
    permission,
    avatar_url,
    capacity_limit,
    is_active,
    created_at,
    updated_at
  FROM public.team_members;

-- Comentário explicativo
COMMENT ON VIEW public.team_members_public IS 'Public view of team members without email - uses security_invoker to inherit RLS from team_members table';