
CREATE TABLE public.role_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.available_roles(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, deliverable_type)
);

ALTER TABLE public.role_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view role_deliverables"
  ON public.role_deliverables
  FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can insert role_deliverables"
  ON public.role_deliverables
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update role_deliverables"
  ON public.role_deliverables
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete role_deliverables"
  ON public.role_deliverables
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
