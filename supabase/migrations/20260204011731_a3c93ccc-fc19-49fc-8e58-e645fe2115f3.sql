-- Create onboarding templates table (linked to service modules)
CREATE TABLE public.onboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.service_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id)
);

-- Create onboarding template steps table
CREATE TABLE public.onboarding_template_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible_role TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client module onboarding table (tracks onboarding per client/contract/module)
CREATE TABLE public.client_module_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  contract_module_id UUID NOT NULL REFERENCES public.contract_modules(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.onboarding_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'waiting_client', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_module_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_module_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_templates
CREATE POLICY "Team members can view onboarding_templates"
  ON public.onboarding_templates FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can insert onboarding_templates"
  ON public.onboarding_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update onboarding_templates"
  ON public.onboarding_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete onboarding_templates"
  ON public.onboarding_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for onboarding_template_steps
CREATE POLICY "Team members can view onboarding_template_steps"
  ON public.onboarding_template_steps FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can insert onboarding_template_steps"
  ON public.onboarding_template_steps FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update onboarding_template_steps"
  ON public.onboarding_template_steps FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete onboarding_template_steps"
  ON public.onboarding_template_steps FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for client_module_onboarding
CREATE POLICY "Team members can view client_module_onboarding"
  ON public.client_module_onboarding FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert client_module_onboarding"
  ON public.client_module_onboarding FOR INSERT
  WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can update client_module_onboarding"
  ON public.client_module_onboarding FOR UPDATE
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can delete client_module_onboarding"
  ON public.client_module_onboarding FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON public.onboarding_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_template_steps_updated_at
  BEFORE UPDATE ON public.onboarding_template_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_module_onboarding_updated_at
  BEFORE UPDATE ON public.client_module_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add onboarding flag to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS requires_onboarding BOOLEAN NOT NULL DEFAULT false;

-- Create index for better performance
CREATE INDEX idx_onboarding_template_steps_template_id ON public.onboarding_template_steps(template_id);
CREATE INDEX idx_client_module_onboarding_client_id ON public.client_module_onboarding(client_id);
CREATE INDEX idx_client_module_onboarding_contract_id ON public.client_module_onboarding(contract_id);