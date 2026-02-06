-- Create table for multiple task assignees
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view task_assignees" 
  ON public.task_assignees FOR SELECT 
  USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert task_assignees" 
  ON public.task_assignees FOR INSERT 
  WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can delete task_assignees" 
  ON public.task_assignees FOR DELETE 
  USING (is_team_member(auth.uid()));

-- Create table for customizable Kanban columns
CREATE TABLE public.kanban_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color_class TEXT NOT NULL DEFAULT 'bg-muted/50 border-muted-foreground/20',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view kanban_columns" 
  ON public.kanban_columns FOR SELECT 
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can insert kanban_columns" 
  ON public.kanban_columns FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update kanban_columns" 
  ON public.kanban_columns FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete kanban_columns" 
  ON public.kanban_columns FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_protected = false);

-- Insert default columns (protected ones cannot be deleted)
INSERT INTO public.kanban_columns (key, label, color_class, order_index, is_protected) VALUES
  ('overdue', 'Pra ontem 🔥', 'bg-destructive/10 border-destructive/30', 0, true),
  ('todo', 'A fazer', 'bg-muted/50 border-muted-foreground/20', 1, true),
  ('in_progress', 'Em produção', 'bg-primary/10 border-primary/30', 2, false),
  ('review', 'Em revisão', 'bg-warning/10 border-warning/30', 3, false),
  ('waiting_client', 'Aguardando cliente', 'bg-info/10 border-info/30', 4, false),
  ('done', 'Entregue', 'bg-success/10 border-success/30', 5, true);

-- Create trigger to update updated_at
CREATE TRIGGER update_kanban_columns_updated_at
  BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();