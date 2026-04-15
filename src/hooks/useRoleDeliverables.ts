import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoleDeliverable {
  id: string;
  role_id: string;
  deliverable_type: string;
  created_at: string;
}

export function useRoleDeliverables(roleId?: string) {
  return useQuery({
    queryKey: ["role_deliverables", roleId],
    queryFn: async () => {
      let query = (supabase as any).from("role_deliverables").select("*").order("deliverable_type");
      if (roleId) query = query.eq("role_id", roleId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RoleDeliverable[];
    },
  });
}

export function useAllRoleDeliverables() {
  return useQuery({
    queryKey: ["role_deliverables"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("role_deliverables")
        .select("*")
        .order("deliverable_type");
      if (error) throw error;
      return (data || []) as RoleDeliverable[];
    },
  });
}

export function useAddRoleDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, deliverableType }: { roleId: string; deliverableType: string }) => {
      const { data, error } = await (supabase as any)
        .from("role_deliverables")
        .insert({ role_id: roleId, deliverable_type: deliverableType.trim() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role_deliverables"] });
      toast.success("Tipo de entrega adicionado");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Este tipo já existe para este cargo");
      } else {
        toast.error("Erro: " + error.message);
      }
    },
  });
}

export function useDeleteRoleDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("role_deliverables")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role_deliverables"] });
      toast.success("Tipo de entrega removido");
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });
}
