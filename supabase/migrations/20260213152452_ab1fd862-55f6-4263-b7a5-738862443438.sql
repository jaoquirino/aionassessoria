
-- Create available_roles table
CREATE TABLE public.available_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.available_roles ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read roles
CREATE POLICY "Authenticated users can view roles"
ON public.available_roles FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage roles
CREATE POLICY "Admins can insert roles"
ON public.available_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.available_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed with existing roles
INSERT INTO public.available_roles (name) VALUES
  ('Designer'),
  ('Gestor de Tráfego'),
  ('Copywriter'),
  ('Comercial'),
  ('Atendimento'),
  ('Desenvolvedor'),
  ('Social Media'),
  ('Estrategista'),
  ('Diretor de Arte'),
  ('Produtor de Conteúdo');
