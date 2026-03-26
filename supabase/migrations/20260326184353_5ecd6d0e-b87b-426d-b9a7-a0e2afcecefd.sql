DROP POLICY IF EXISTS "Allow anon to check must_reset_password by username" ON public.profiles;

CREATE OR REPLACE FUNCTION public.check_must_reset_password(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT must_reset_password FROM public.profiles WHERE username = lower(_username) LIMIT 1),
    false
  )
$$;