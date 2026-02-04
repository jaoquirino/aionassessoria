import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ServiceModule {
  id: string;
  name: string;
  description: string | null;
  default_weight: number;
  is_recurring: boolean;
  primary_role: string;
  deliverable_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  activeClients?: number;
}

export interface CreateModuleInput {
  name: string;
  description?: string;
  default_weight?: number;
  is_recurring?: boolean;
  primary_role: string;
  deliverable_limit?: number | null;
}

export interface UpdateModuleInput {
  id: string;
  name?: string;
  description?: string;
  default_weight?: number;
  is_recurring?: boolean;
  primary_role?: string;
  deliverable_limit?: number | null;
  is_active?: boolean;
}

// Fetch all service modules with active client count
export function useAllModules() {
  return useQuery({
    queryKey: ["all_service_modules"],
    queryFn: async () => {
      const { data: modules, error } = await supabase
        .from("service_modules")
        .select("*")
        .order("name");

      if (error) throw error;

      // Get active client counts per module
      const { data: contractModules } = await supabase
        .from("contract_modules")
        .select(`
          module_id,
          contract:contracts!inner(status, client_id)
        `)
        .eq("contract.status", "active");

      const moduleCounts = new Map<string, Set<string>>();
      contractModules?.forEach(cm => {
        const current = moduleCounts.get(cm.module_id) || new Set();
        if (cm.contract && typeof cm.contract === 'object' && 'client_id' in cm.contract) {
          current.add(cm.contract.client_id as string);
        }
        moduleCounts.set(cm.module_id, current);
      });

      return (modules as ServiceModule[]).map(module => ({
        ...module,
        activeClients: moduleCounts.get(module.id)?.size || 0,
      }));
    },
  });
}

// Create module
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateModuleInput) => {
      const { data, error } = await supabase
        .from("service_modules")
        .insert({
          name: input.name,
          description: input.description || null,
          default_weight: input.default_weight || 2,
          is_recurring: input.is_recurring ?? true,
          primary_role: input.primary_role,
          deliverable_limit: input.deliverable_limit,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_service_modules"] });
      queryClient.invalidateQueries({ queryKey: ["service_modules"] });
      toast.success("Módulo criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar módulo: " + error.message);
    },
  });
}

// Update module
export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateModuleInput) => {
      const { id, ...updateData } = input;
      const { data, error } = await supabase
        .from("service_modules")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_service_modules"] });
      queryClient.invalidateQueries({ queryKey: ["service_modules"] });
      toast.success("Módulo atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar módulo: " + error.message);
    },
  });
}

// Delete module
export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from("service_modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_service_modules"] });
      queryClient.invalidateQueries({ queryKey: ["service_modules"] });
      toast.success("Módulo removido");
    },
    onError: (error) => {
      toast.error("Erro ao remover módulo: " + error.message);
    },
  });
}
