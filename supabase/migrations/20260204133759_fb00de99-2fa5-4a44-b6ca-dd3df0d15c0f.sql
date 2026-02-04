-- A view team_members_public já usa security_invoker=on, então herda RLS da tabela base
-- Porém, precisamos garantir que as políticas da tabela team_members estejam corretas
-- e que a view só seja acessível por membros autenticados da equipe

-- Primeiro, vamos verificar e garantir que a view tenha RLS adequado
-- Como a view usa security_invoker, ela herda as políticas da tabela team_members
-- As políticas existentes já restringem acesso a team members autenticados

-- Adicionar uma política específica para a view que garante acesso apenas a membros da equipe
-- Nota: Views com security_invoker herdam RLS da tabela base, então não precisamos de políticas separadas

-- O problema identificado é que a tabela team_members tem email exposto
-- A solução é garantir que a view NÃO inclua o campo email (já está correto)
-- E que o acesso seja restrito via RLS

-- Verificar se existe alguma política permissiva demais na tabela base
-- Olhando as políticas existentes:
-- - "Admins can view all team_members" - OK, usa has_role
-- - "Team members can view via public view" - usa is_team_member
-- - "Users can view own team_member record" - OK, verifica email do próprio usuário

-- O problema real é: is_team_member e has_role podem retornar false para usuários não autenticados
-- mas o acesso anônimo não deveria ser possível

-- Vamos garantir que as políticas exijam autenticação explícita
-- Primeiro, dropar a política que pode ser ambígua
DROP POLICY IF EXISTS "Team members can view via public view" ON public.team_members;

-- Recriar com verificação explícita de autenticação
CREATE POLICY "Authenticated team members can view team_members" 
ON public.team_members 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member(auth.uid())
);

-- Garantir que a view team_members_public tenha a estrutura correta (sem email)
-- Já verificado: a view não inclui email, apenas campos seguros