
CREATE TABLE public.module_deliverable_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.service_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, name)
);

ALTER TABLE public.module_deliverable_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view module_deliverable_types"
  ON public.module_deliverable_types
  FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can insert module_deliverable_types"
  ON public.module_deliverable_types
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update module_deliverable_types"
  ON public.module_deliverable_types
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete module_deliverable_types"
  ON public.module_deliverable_types
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
