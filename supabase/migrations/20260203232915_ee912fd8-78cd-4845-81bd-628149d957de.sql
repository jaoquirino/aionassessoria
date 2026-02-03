-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- 2. Criar tabela de roles
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Habilitar RLS na tabela de roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar função security definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Função para verificar se é membro (admin ou member)
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- 6. Políticas para user_roles - apenas admins podem gerenciar
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_team_member(auth.uid()));

-- 7. Adicionar campo priority na tabela tasks
ALTER TABLE public.tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium';

-- 8. Criar tabela de comentários
CREATE TABLE public.task_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- 9. Políticas para comentários
CREATE POLICY "Team members can view comments"
ON public.task_comments FOR SELECT
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert comments"
ON public.task_comments FOR INSERT
WITH CHECK (public.is_team_member(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON public.task_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.task_comments FOR DELETE
USING (auth.uid() = user_id);

-- 10. Remover políticas antigas permissivas e criar novas restritivas

-- clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

CREATE POLICY "Team members can view clients" ON public.clients FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert clients" ON public.clients FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update clients" ON public.clients FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- contracts
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON public.contracts;

CREATE POLICY "Team members can view contracts" ON public.contracts FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert contracts" ON public.contracts FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update contracts" ON public.contracts FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can delete contracts" ON public.contracts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- tasks
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

CREATE POLICY "Team members can view tasks" ON public.tasks FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert tasks" ON public.tasks FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update tasks" ON public.tasks FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- team_members
DROP POLICY IF EXISTS "Authenticated users can view team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can insert team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can update team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team_members" ON public.team_members;

CREATE POLICY "Team members can view team_members" ON public.team_members FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can insert team_members" ON public.team_members FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update team_members" ON public.team_members FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete team_members" ON public.team_members FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- service_modules
DROP POLICY IF EXISTS "Authenticated users can view service_modules" ON public.service_modules;
DROP POLICY IF EXISTS "Authenticated users can insert service_modules" ON public.service_modules;
DROP POLICY IF EXISTS "Authenticated users can update service_modules" ON public.service_modules;
DROP POLICY IF EXISTS "Authenticated users can delete service_modules" ON public.service_modules;

CREATE POLICY "Team members can view service_modules" ON public.service_modules FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can insert service_modules" ON public.service_modules FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update service_modules" ON public.service_modules FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete service_modules" ON public.service_modules FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- contract_modules
DROP POLICY IF EXISTS "Authenticated users can view contract_modules" ON public.contract_modules;
DROP POLICY IF EXISTS "Authenticated users can insert contract_modules" ON public.contract_modules;
DROP POLICY IF EXISTS "Authenticated users can update contract_modules" ON public.contract_modules;
DROP POLICY IF EXISTS "Authenticated users can delete contract_modules" ON public.contract_modules;

CREATE POLICY "Team members can view contract_modules" ON public.contract_modules FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert contract_modules" ON public.contract_modules FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update contract_modules" ON public.contract_modules FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can delete contract_modules" ON public.contract_modules FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- client_onboarding
DROP POLICY IF EXISTS "Authenticated users can view onboarding" ON public.client_onboarding;
DROP POLICY IF EXISTS "Authenticated users can insert onboarding" ON public.client_onboarding;
DROP POLICY IF EXISTS "Authenticated users can update onboarding" ON public.client_onboarding;
DROP POLICY IF EXISTS "Authenticated users can delete onboarding" ON public.client_onboarding;

CREATE POLICY "Team members can view onboarding" ON public.client_onboarding FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert onboarding" ON public.client_onboarding FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update onboarding" ON public.client_onboarding FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can delete onboarding" ON public.client_onboarding FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- task_attachments
DROP POLICY IF EXISTS "Authenticated users can view task_attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Authenticated users can insert task_attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Authenticated users can update task_attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete task_attachments" ON public.task_attachments;

CREATE POLICY "Team members can view task_attachments" ON public.task_attachments FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert task_attachments" ON public.task_attachments FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update task_attachments" ON public.task_attachments FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can delete task_attachments" ON public.task_attachments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- task_checklist
DROP POLICY IF EXISTS "Authenticated users can view task_checklist" ON public.task_checklist;
DROP POLICY IF EXISTS "Authenticated users can insert task_checklist" ON public.task_checklist;
DROP POLICY IF EXISTS "Authenticated users can update task_checklist" ON public.task_checklist;
DROP POLICY IF EXISTS "Authenticated users can delete task_checklist" ON public.task_checklist;

CREATE POLICY "Team members can view task_checklist" ON public.task_checklist FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert task_checklist" ON public.task_checklist FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update task_checklist" ON public.task_checklist FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can delete task_checklist" ON public.task_checklist FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- task_history (já tem políticas corretas, só atualizar)
DROP POLICY IF EXISTS "Authenticated users can view task_history" ON public.task_history;
DROP POLICY IF EXISTS "Authenticated users can insert task_history" ON public.task_history;

CREATE POLICY "Team members can view task_history" ON public.task_history FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert task_history" ON public.task_history FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));

-- Trigger para updated_at nos comentários
CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();