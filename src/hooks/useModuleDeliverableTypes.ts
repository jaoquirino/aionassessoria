import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModuleDeliverableType {
  id: string;
  module_id: string;
  name: string;
  created_at: string;
}

export function useModuleDeliverableTypes(moduleId?: string) {
  return useQuery({
    queryKey: ["module_deliverable_types", moduleId],
    queryFn: async () => {
      let query = supabase.from("module_deliverable_types").select("*").order("name");
      if (moduleId) query = query.eq("module_id", moduleId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ModuleDeliverableType[];
    },
  });
}

export function useAllModuleDeliverableTypes() {
  return useQuery({
    queryKey: ["module_deliverable_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverable_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as ModuleDeliverableType[];
    },
  });
}

export function useAddModuleDeliverableType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, name }: { moduleId: string; name: string }) => {
      const { data, error } = await supabase
        .from("module_deliverable_types")
        .insert({ module_id: moduleId, name: name.trim() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module_deliverable_types"] });
      toast.success("Tipo de entrega adicionado");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Este tipo já existe para este módulo");
      } else {
        toast.error("Erro: " + error.message);
      }
    },
  });
}

export function useDeleteModuleDeliverableType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("module_deliverable_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module_deliverable_types"] });
      toast.success("Tipo de entrega removido");
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });
}
