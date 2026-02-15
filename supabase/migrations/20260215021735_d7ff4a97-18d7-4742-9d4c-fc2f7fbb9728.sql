
-- Create task_priorities table
CREATE TABLE public.task_priorities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  order_index integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_priorities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Team members can view priorities" ON public.task_priorities
  FOR SELECT USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can insert priorities" ON public.task_priorities
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update priorities" ON public.task_priorities
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete priorities" ON public.task_priorities
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default priorities
INSERT INTO public.task_priorities (key, label, color, order_index, is_default) VALUES
  ('urgent', 'Pra ontem', '#EF4444', 1, false),
  ('high', 'Alta', '#F59E0B', 2, false),
  ('medium', 'Média', '#3B82F6', 3, true),
  ('low', 'Baixa', '#10B981', 4, false);

-- Trigger for updated_at
CREATE TRIGGER update_task_priorities_updated_at
  BEFORE UPDATE ON public.task_priorities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
