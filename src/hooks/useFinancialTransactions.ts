import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FinancialCategory {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  date: string;
  category_id: string | null;
  client_id: string | null;
  contract_id: string | null;
  is_auto_generated: boolean;
  reference_month: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  category?: FinancialCategory | null;
  client?: { id: string; name: string; logo_url: string | null; color: string | null } | null;
  contract?: { id: string; monthly_value: number } | null;
}

export interface CreateTransactionInput {
  type: "income" | "expense";
  amount: number;
  description?: string;
  date: string;
  category_id?: string | null;
  client_id?: string | null;
  contract_id?: string | null;
}

export interface UpdateTransactionInput {
  id: string;
  type?: "income" | "expense";
  amount?: number;
  description?: string | null;
  date?: string;
  category_id?: string | null;
  client_id?: string | null;
  contract_id?: string | null;
}

// Fetch categories
export function useFinancialCategories() {
  return useQuery({
    queryKey: ["financial_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as FinancialCategory[];
    },
    staleTime: 60000,
  });
}

// Fetch transactions with filters
export function useFinancialTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  type?: "income" | "expense";
  categoryId?: string;
}) {
  return useQuery({
    queryKey: ["financial_transactions", filters],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          category:financial_categories(*),
          client:clients(id, name, logo_url, color),
          contract:contracts(id, monthly_value)
        `)
        .order("date", { ascending: false });

      if (filters?.startDate) query = query.gte("date", filters.startDate);
      if (filters?.endDate) query = query.lte("date", filters.endDate);
      if (filters?.type) query = query.eq("type", filters.type);
      if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);

      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialTransaction[];
    },
  });
}

// Create transaction with optimistic update
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      // Get team member id
      const { data: { user } } = await supabase.auth.getUser();
      let teamMemberId: string | null = null;
      if (user) {
        const { data: tm } = await supabase
          .from("team_members")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        teamMemberId = tm?.id || null;
      }

      const { data, error } = await supabase
        .from("financial_transactions")
        .insert({
          ...input,
          description: input.description || null,
          category_id: input.category_id || null,
          client_id: input.client_id || null,
          contract_id: input.contract_id || null,
          created_by: teamMemberId,
        })
        .select(`
          *,
          category:financial_categories(*),
          client:clients(id, name, logo_url, color),
          contract:contracts(id, monthly_value)
        `)
        .single();
      if (error) throw error;
      return data as FinancialTransaction;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["financial_transactions"] });
      const previousAll = queryClient.getQueriesData({ queryKey: ["financial_transactions"] });

      const optimistic: FinancialTransaction = {
        id: `temp-${Date.now()}`,
        type: input.type,
        amount: input.amount,
        description: input.description || null,
        date: input.date,
        category_id: input.category_id || null,
        client_id: input.client_id || null,
        contract_id: input.contract_id || null,
        is_auto_generated: false,
        reference_month: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: null,
        client: null,
        contract: null,
      };

      queryClient.setQueriesData(
        { queryKey: ["financial_transactions"] },
        (old: FinancialTransaction[] | undefined) => old ? [optimistic, ...old] : [optimistic]
      );

      return { previousAll };
    },
    onError: (_err, _vars, context) => {
      context?.previousAll?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Erro ao criar lançamento");
    },
    onSuccess: () => {
      toast.success("Lançamento criado");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    },
  });
}

// Update transaction with optimistic update
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTransactionInput) => {
      const { id, ...updateData } = input;
      const { data, error } = await supabase
        .from("financial_transactions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["financial_transactions"] });
      const previousAll = queryClient.getQueriesData({ queryKey: ["financial_transactions"] });

      queryClient.setQueriesData(
        { queryKey: ["financial_transactions"] },
        (old: FinancialTransaction[] | undefined) =>
          old?.map((t) => (t.id === input.id ? { ...t, ...input } : t))
      );

      return { previousAll };
    },
    onError: (_err, _vars, context) => {
      context?.previousAll?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Erro ao atualizar lançamento");
    },
    onSuccess: () => {
      toast.success("Lançamento atualizado");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    },
  });
}

// Delete transaction with optimistic update
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["financial_transactions"] });
      const previousAll = queryClient.getQueriesData({ queryKey: ["financial_transactions"] });

      queryClient.setQueriesData(
        { queryKey: ["financial_transactions"] },
        (old: FinancialTransaction[] | undefined) => old?.filter((t) => t.id !== id)
      );

      return { previousAll };
    },
    onError: (_err, _vars, context) => {
      context?.previousAll?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Erro ao excluir lançamento");
    },
    onSuccess: () => {
      toast.success("Lançamento excluído");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    },
  });
}

// CRUD for categories
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; type: "income" | "expense" | "both"; color: string }) => {
      const { data, error } = await supabase
        .from("financial_categories")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_categories"] });
      toast.success("Categoria criada");
    },
    onError: () => toast.error("Erro ao criar categoria"),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; type?: string; color?: string; is_active?: boolean }) => {
      const { id, ...data } = input;
      const { error } = await supabase.from("financial_categories").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_categories"] });
      toast.success("Categoria atualizada");
    },
    onError: () => toast.error("Erro ao atualizar categoria"),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_categories").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_categories"] });
      toast.success("Categoria removida");
    },
    onError: () => toast.error("Erro ao remover categoria"),
  });
}
