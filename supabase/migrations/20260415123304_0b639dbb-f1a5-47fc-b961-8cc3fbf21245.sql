
-- Create module_permissions table
CREATE TABLE public.module_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module text NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  sub_permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, module)
);

-- Enable RLS
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can manage module_permissions"
ON public.module_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Gestors can view permissions
CREATE POLICY "Gestors can view module_permissions"
ON public.module_permissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

-- Users can view own permissions
CREATE POLICY "Users can view own module_permissions"
ON public.module_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_module_permissions_updated_at
BEFORE UPDATE ON public.module_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add module_permissions to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_permissions;

-- Helper function to check module access
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN true
    ELSE COALESCE(
      (SELECT can_access FROM public.module_permissions WHERE user_id = _user_id AND module = _module),
      true
    )
  END
$$;
