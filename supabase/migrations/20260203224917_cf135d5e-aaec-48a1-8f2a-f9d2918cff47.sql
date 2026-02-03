-- Create team_members table
CREATE TABLE public.team_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL, -- Designer, Gestor de Tráfego, Copy, Comercial, etc.
    permission TEXT NOT NULL DEFAULT 'operational', -- admin, operational
    avatar_url TEXT,
    capacity_limit INTEGER NOT NULL DEFAULT 20, -- peso máximo
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contracts table
CREATE TABLE public.contracts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    monthly_value DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    minimum_duration_months INTEGER NOT NULL DEFAULT 12,
    renewal_date DATE,
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, ended
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_modules table with deliverable tracking
CREATE TABLE public.service_modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_weight INTEGER NOT NULL DEFAULT 2,
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    primary_role TEXT NOT NULL, -- função principal envolvida
    deliverable_limit INTEGER, -- limite de entregáveis (para design)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract_modules junction table
CREATE TABLE public.contract_modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.service_modules(id) ON DELETE CASCADE,
    custom_weight INTEGER, -- peso personalizado para este contrato
    deliverable_limit INTEGER, -- limite customizado de entregáveis
    deliverable_used INTEGER NOT NULL DEFAULT 0, -- entregáveis usados no mês
    last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE, -- última vez que zerou
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(contract_id, module_id)
);

-- Create task_type enum
CREATE TYPE public.task_type AS ENUM ('recurring', 'planning', 'project', 'extra');

-- Create task_status enum  
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'waiting_client', 'done');

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    contract_module_id UUID REFERENCES public.contract_modules(id) ON DELETE SET NULL,
    type public.task_type NOT NULL,
    required_role TEXT NOT NULL,
    assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    status public.task_status NOT NULL DEFAULT 'todo',
    weight INTEGER NOT NULL, -- calculado automaticamente baseado no tipo
    description_objective TEXT, -- Objetivo da tarefa
    description_deliverable TEXT, -- O que deve ser entregue
    description_references TEXT, -- Referências/links
    description_notes TEXT, -- Observações
    is_deliverable BOOLEAN NOT NULL DEFAULT false, -- conta como entregável do módulo
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_checklist table
CREATE TABLE public.task_checklist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT, -- image, document, link, etc.
    uploaded_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_history table for audit logging
CREATE TABLE public.task_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- status_change, assignee_change, comment, created
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    performed_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to calculate task weight based on type
CREATE OR REPLACE FUNCTION public.calculate_task_weight(task_type public.task_type)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE task_type
        WHEN 'recurring' THEN 2
        WHEN 'planning' THEN 1
        WHEN 'project' THEN 4
        WHEN 'extra' THEN 3
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Trigger to auto-set weight on task insert/update
CREATE OR REPLACE FUNCTION public.set_task_weight()
RETURNS TRIGGER AS $$
BEGIN
    NEW.weight := public.calculate_task_weight(NEW.type);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_set_task_weight
BEFORE INSERT OR UPDATE OF type ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_weight();

-- Trigger to log task history on status/assignee changes
CREATE OR REPLACE FUNCTION public.log_task_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value)
        VALUES (NEW.id, 'status_change', OLD.status::TEXT, NEW.status::TEXT);
    END IF;
    
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.task_history (task_id, action_type, old_value, new_value)
        VALUES (NEW.id, 'assignee_change', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_log_task_history
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_history();

-- Function to increment deliverable count when task is marked as done
CREATE OR REPLACE FUNCTION public.update_deliverable_count()
RETURNS TRIGGER AS $$
BEGIN
    -- When task is marked as done and is a deliverable
    IF NEW.status = 'done' AND NEW.is_deliverable = true AND NEW.contract_module_id IS NOT NULL THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            UPDATE public.contract_modules
            SET deliverable_used = deliverable_used + 1
            WHERE id = NEW.contract_module_id;
        END IF;
    END IF;
    
    -- If task was done and is being reverted
    IF OLD.status = 'done' AND NEW.status != 'done' AND NEW.is_deliverable = true AND NEW.contract_module_id IS NOT NULL THEN
        UPDATE public.contract_modules
        SET deliverable_used = GREATEST(0, deliverable_used - 1)
        WHERE id = NEW.contract_module_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_deliverable_count
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_deliverable_count();

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for authenticated users for now)
CREATE POLICY "Authenticated users can view team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert team_members" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update team_members" ON public.team_members FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete team_members" ON public.team_members FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert contracts" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update contracts" ON public.contracts FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete contracts" ON public.contracts FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view service_modules" ON public.service_modules FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert service_modules" ON public.service_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update service_modules" ON public.service_modules FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete service_modules" ON public.service_modules FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view contract_modules" ON public.contract_modules FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert contract_modules" ON public.contract_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update contract_modules" ON public.contract_modules FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete contract_modules" ON public.contract_modules FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view task_checklist" ON public.task_checklist FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert task_checklist" ON public.task_checklist FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update task_checklist" ON public.task_checklist FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete task_checklist" ON public.task_checklist FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view task_attachments" ON public.task_attachments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert task_attachments" ON public.task_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update task_attachments" ON public.task_attachments FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete task_attachments" ON public.task_attachments FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view task_history" ON public.task_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert task_history" ON public.task_history FOR INSERT WITH CHECK (true);

-- Insert default service modules
INSERT INTO public.service_modules (name, description, default_weight, is_recurring, primary_role, deliverable_limit) VALUES
('Gestão de Tráfego', 'Gerenciamento de campanhas de mídia paga', 2, true, 'Gestor de Tráfego', NULL),
('Copywriting', 'Criação de textos e conteúdo', 2, true, 'Copywriter', NULL),
('Design (Artes e Vídeos)', 'Criação de artes e edição de vídeos', 2, true, 'Designer', 10),
('Estruturação Comercial', 'Estratégia e processos comerciais', 3, false, 'Comercial', NULL),
('Landing Pages/Sites', 'Desenvolvimento de páginas e sites', 4, false, 'Designer', NULL),
('Cardápio Digital', 'Estruturação de cardápio digital', 3, false, 'Designer', NULL),
('Identidade Visual', 'Criação de identidade visual completa', 4, false, 'Designer', NULL);

-- Create updated_at triggers
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_modules_updated_at BEFORE UPDATE ON public.service_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();