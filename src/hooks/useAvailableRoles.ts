import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AvailableRole {
  id: string;
  name: string;
  created_at: string;
}

export function useAvailableRoles() {
  return useQuery({
    queryKey: ["available_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_roles" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data as unknown as AvailableRole[]);
    },
  });
}

export function useRoleNames() {
  const { data: roles } = useAvailableRoles();
  return roles?.map(r => r.name) || [];
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await (supabase as any)
        .from("available_roles")
        .insert({ name: name.trim() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available_roles"] });
      toast.success("Cargo adicionado");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Este cargo já existe");
      } else {
        toast.error("Erro ao adicionar cargo: " + error.message);
      }
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await (supabase as any)
        .from("available_roles")
        .update({ name: name.trim() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available_roles"] });
      toast.success("Cargo atualizado");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Este cargo já existe");
      } else {
        toast.error("Erro ao atualizar cargo: " + error.message);
      }
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("available_roles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available_roles"] });
      toast.success("Cargo removido");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover cargo: " + error.message);
    },
  });
}
