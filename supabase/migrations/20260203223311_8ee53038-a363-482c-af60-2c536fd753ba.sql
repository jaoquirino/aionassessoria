-- Create enum for client status
CREATE TYPE public.client_status AS ENUM ('onboarding', 'active', 'paused', 'ended');

-- Create enum for onboarding step status
CREATE TYPE public.onboarding_step_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create clients table
CREATE TABLE public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    status client_status NOT NULL DEFAULT 'onboarding',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients (for now, allow authenticated users full access)
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients"
ON public.clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients"
ON public.clients FOR DELETE TO authenticated USING (true);

-- Create client_onboarding table
CREATE TABLE public.client_onboarding (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    status onboarding_step_status NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_id, step_name)
);

-- Enable RLS on client_onboarding
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies for client_onboarding
CREATE POLICY "Authenticated users can view onboarding"
ON public.client_onboarding FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert onboarding"
ON public.client_onboarding FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update onboarding"
ON public.client_onboarding FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete onboarding"
ON public.client_onboarding FOR DELETE TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_onboarding_updated_at
BEFORE UPDATE ON public.client_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize onboarding steps for new client
CREATE OR REPLACE FUNCTION public.initialize_client_onboarding()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create onboarding steps if status is 'onboarding'
    IF NEW.status = 'onboarding' THEN
        INSERT INTO public.client_onboarding (client_id, step_name, step_order)
        VALUES
            (NEW.id, 'Coleta de acessos', 1),
            (NEW.id, 'Briefing inicial', 2),
            (NEW.id, 'Definição de módulos', 3),
            (NEW.id, 'Reunião de kickoff', 4);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-create onboarding steps
CREATE TRIGGER create_onboarding_steps
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.initialize_client_onboarding();