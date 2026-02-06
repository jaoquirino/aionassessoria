-- Add new contact fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add response field to onboarding template steps for storing collected data
ALTER TABLE public.onboarding_template_steps
ADD COLUMN IF NOT EXISTS response_type TEXT DEFAULT 'checkbox',
ADD COLUMN IF NOT EXISTS response_required BOOLEAN DEFAULT false;

-- Create table for storing onboarding step responses
CREATE TABLE IF NOT EXISTS public.client_onboarding_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_module_id UUID NOT NULL REFERENCES public.contract_modules(id) ON DELETE CASCADE,
  template_step_id UUID NOT NULL REFERENCES public.onboarding_template_steps(id) ON DELETE CASCADE,
  response_value TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.team_members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, contract_module_id, template_step_id)
);

-- Enable RLS
ALTER TABLE public.client_onboarding_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_onboarding_responses
CREATE POLICY "Team members can view client_onboarding_responses" 
ON public.client_onboarding_responses 
FOR SELECT 
USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert client_onboarding_responses" 
ON public.client_onboarding_responses 
FOR INSERT 
WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can update client_onboarding_responses" 
ON public.client_onboarding_responses 
FOR UPDATE 
USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can delete client_onboarding_responses" 
ON public.client_onboarding_responses 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_client_onboarding_responses_client 
ON public.client_onboarding_responses(client_id);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_responses_module 
ON public.client_onboarding_responses(contract_module_id);