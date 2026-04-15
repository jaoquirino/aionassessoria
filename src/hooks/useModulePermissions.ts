import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard", description: "Visão geral e métricas" },
  { key: "tasks", label: "Tarefas", description: "Gestão de tarefas e Kanban" },
  { key: "calendar", label: "Calendário", description: "Calendário de tarefas e editorial" },
  { key: "clients", label: "Clientes", description: "Gestão de clientes e contratos" },
  { key: "team", label: "Equipe", description: "Gestão de integrantes" },
  { key: "financial", label: "Financeiro", description: "Entradas, saídas e despesas" },
  { key: "settings", label: "Configurações", description: "Ajustes do sistema" },
] as const;

export type ModuleKey = typeof ALL_MODULES[number]["key"];

// Dashboard sub-permissions
export const DASHBOARD_SUB_PERMISSIONS = [
  { key: "client_health", label: "Saúde dos Clientes" },
  { key: "team_capacity", label: "Capacidade da Equipe" },
  { key: "revenue", label: "Receita / MRR" },
  { key: "contracts_alert", label: "Alertas de Contratos" },
  { key: "onboarding", label: "Onboarding" },
  { key: "tasks_overview", label: "Visão de Tarefas" },
] as const;

export interface ModulePermission {
  id: string;
  user_id: string;
  module: string;
  can_access: boolean;
  sub_permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

// Get permissions for current user
export function useMyModulePermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my_module_permissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as ModulePermission[];
    },
    enabled: !!user,
  });
}

// Check if current user can access a specific module
export function useCanAccessModule(moduleKey: ModuleKey) {
  const { data: permissions, isLoading } = useMyModulePermissions();
  const { data: isAdmin } = useIsAdminRole();

  if (isAdmin) return { canAccess: true, isLoading: false };
  if (isLoading) return { canAccess: true, isLoading: true }; // default allow while loading

  const perm = permissions?.find((p) => p.module === moduleKey);
  // Default to true if no record exists (navbar handles role-based filtering)
  return { canAccess: perm ? perm.can_access : true, isLoading: false };
}

// Check if user has specific dashboard sub-permission
export function useDashboardSubPermission(subKey: string) {
  const { data: permissions, isLoading } = useMyModulePermissions();
  const { data: isAdmin } = useIsAdminRole();

  if (isAdmin) return { canView: true, isLoading: false };
  if (isLoading) return { canView: true, isLoading: true };

  const dashPerm = permissions?.find((p) => p.module === "dashboard");
  if (!dashPerm) return { canView: true, isLoading: false };
  
  const subs = dashPerm.sub_permissions || {};
  // Default to true if not set
  return { canView: subs[subKey] !== false, isLoading: false };
}

// Quick admin check without hooks dependency loop
function useIsAdminRole() {
  return useQuery({
    queryKey: ["is_admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });
}

// Get all permissions for a specific user (admin use)
export function useUserModulePermissions(userId: string | null) {
  return useQuery({
    queryKey: ["user_module_permissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return (data || []) as ModulePermission[];
    },
    enabled: !!userId,
  });
}

// Set module permission for a user
export function useSetModulePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      module,
      canAccess,
      subPermissions,
    }: {
      userId: string;
      module: string;
      canAccess: boolean;
      subPermissions?: Record<string, boolean>;
    }) => {
      const { data, error } = await supabase
        .from("module_permissions")
        .upsert(
          {
            user_id: userId,
            module,
            can_access: canAccess,
            sub_permissions: subPermissions || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user_module_permissions", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["my_module_permissions"] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar permissão: " + error.message);
    },
  });
}

// Bulk set all module permissions for a user
export function useBulkSetModulePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: Array<{ module: string; can_access: boolean; sub_permissions?: Record<string, boolean> }>;
    }) => {
      const upserts = permissions.map((p) => ({
        user_id: userId,
        module: p.module,
        can_access: p.can_access,
        sub_permissions: p.sub_permissions || {},
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("module_permissions")
        .upsert(upserts, { onConflict: "user_id,module" });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user_module_permissions", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["my_module_permissions"] });
      toast.success("Permissões de módulos atualizadas");
    },
    onError: (error) => {
      toast.error("Erro ao salvar permissões: " + error.message);
    },
  });
}
