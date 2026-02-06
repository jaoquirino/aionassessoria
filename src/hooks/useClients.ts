import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ClientStatus = "onboarding" | "active" | "paused" | "ended";

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithContracts extends Client {
  contracts: Array<{
    id: string;
    monthly_value: number;
    start_date: string;
    renewal_date: string | null;
    status: string;
  }>;
}

export interface CreateClientInput {
  name: string;
  status?: ClientStatus;
  cnpj?: string;
  phone?: string;
  email?: string;
}

export interface UpdateClientInput {
  id: string;
  name?: string;
  status?: ClientStatus;
  created_at?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
}

// Fetch all clients
export function useAllClients() {
  return useQuery({
    queryKey: ["all_clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          contracts(id, monthly_value, start_date, renewal_date, status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientWithContracts[];
    },
  });
}

// Fetch single client
export function useClient(clientId: string | null) {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          contracts(id, monthly_value, start_date, renewal_date, status)
        `)
        .eq("id", clientId)
        .single();

      if (error) throw error;
      return data as ClientWithContracts;
    },
    enabled: !!clientId,
  });
}

// Create client
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: input.name,
          status: input.status || "onboarding",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente adicionado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar cliente: " + error.message);
    },
  });
}

// Update client with optimistic updates
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateClientInput) => {
      const { id, ...updateData } = input;
      const { data, error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["all_clients"] });
      await queryClient.cancelQueries({ queryKey: ["client", variables.id] });

      // Snapshot previous values
      const previousClients = queryClient.getQueryData(["all_clients"]);
      const previousClient = queryClient.getQueryData(["client", variables.id]);

      // Optimistically update all_clients
      queryClient.setQueryData(["all_clients"], (old: ClientWithContracts[] | undefined) => {
        if (!old) return old;
        return old.map((c) =>
          c.id === variables.id ? { ...c, ...variables } : c
        );
      });

      // Optimistically update single client
      queryClient.setQueryData(["client", variables.id], (old: ClientWithContracts | undefined) => {
        if (!old) return old;
        return { ...old, ...variables };
      });

      return { previousClients, previousClient };
    },
    onError: (_error, variables, context) => {
      // Rollback on error
      if (context?.previousClients) {
        queryClient.setQueryData(["all_clients"], context.previousClients);
      }
      if (context?.previousClient) {
        queryClient.setQueryData(["client", variables.id], context.previousClient);
      }
      toast.error("Erro ao atualizar cliente");
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all_clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.id] });
    },
  });
}

// Delete client
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido");
    },
    onError: (error) => {
      toast.error("Erro ao remover cliente: " + error.message);
    },
  });
}
