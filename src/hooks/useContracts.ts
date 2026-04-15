import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays, addMonths } from "date-fns";
import { parseLocalDate } from "@/lib/utils";

export interface Contract {
  id: string;
  client_id: string;
  monthly_value: number;
  start_date: string;
  minimum_duration_months: number;
  renewal_date: string | null;
  status: string;
  notes: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  daysUntilRenewal?: number;
  computedStatus?: "active" | "expiring_soon" | "renewing" | "ended";
}

export interface ContractWithModules extends Contract {
  modules: Array<{
    id: string;
    module_id: string;
    custom_weight: number | null;
    deliverable_limit: number | null;
    deliverable_used: number;
    service_module: {
      id: string;
      name: string;
      default_weight: number;
      is_recurring: boolean;
    };
  }>;
}

export interface CreateContractInput {
  client_id: string;
  monthly_value: number;
  start_date: string;
  minimum_duration_months?: number;
  renewal_date?: string;
  notes?: string;
  modules?: string[]; // module IDs
  is_recurring?: boolean;
}

export interface UpdateContractInput {
  id: string;
  monthly_value?: number;
  start_date?: string;
  minimum_duration_months?: number;
  renewal_date?: string | null;
  payment_due_day?: number;
  status?: string;
  notes?: string | null;
  is_recurring?: boolean;
}

function computeContractStatus(contract: Contract): { status: "active" | "expiring_soon" | "renewing" | "ended"; daysUntilRenewal: number; shouldAutoEnd: boolean } {
  if (contract.status === "ended") {
    return { status: "ended", daysUntilRenewal: 0, shouldAutoEnd: false };
  }

  const today = new Date();
  const renewalDate = contract.renewal_date ? parseLocalDate(contract.renewal_date) : null;
  const daysUntilRenewal = renewalDate ? differenceInDays(renewalDate, today) : 999;

  // Non-recurring contracts: end after start_date + minimum_duration_months
  if (!contract.is_recurring) {
    const startDate = parseLocalDate(contract.start_date);
    const endDate = addMonths(startDate, contract.minimum_duration_months);
    if (today > endDate) {
      return { status: "ended", daysUntilRenewal: 0, shouldAutoEnd: true };
    }
  }

  // Any contract past renewal date → auto-end
  if (renewalDate && today > renewalDate) {
    return { status: "ended", daysUntilRenewal: 0, shouldAutoEnd: true };
  }
  
  if (daysUntilRenewal <= 7) {
    return { status: "renewing", daysUntilRenewal, shouldAutoEnd: false };
  }
  if (daysUntilRenewal <= 30) {
    return { status: "expiring_soon", daysUntilRenewal, shouldAutoEnd: false };
  }
  return { status: "active", daysUntilRenewal, shouldAutoEnd: false };
}

// Fetch contracts for a specific client
export function useClientContractsWithModules(clientId: string | null) {
  return useQuery({
    queryKey: ["client_contracts_full", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          modules:contract_modules(
            id,
            module_id,
            custom_weight,
            deliverable_limit,
            deliverable_used,
            service_module:service_modules(id, name, default_weight, is_recurring)
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Auto-end expired contracts in DB
      const contractsToEnd = (data as ContractWithModules[]).filter(c => {
        if (c.status === "ended") return false;
        const { shouldAutoEnd } = computeContractStatus(c);
        return shouldAutoEnd;
      });

      if (contractsToEnd.length > 0) {
        await Promise.all(
          contractsToEnd.map(c =>
            supabase.from("contracts").update({ status: "ended" }).eq("id", c.id)
          )
        );
      }

      return (data as ContractWithModules[]).map(contract => {
        const { status, daysUntilRenewal } = computeContractStatus(contract);
        return {
          ...contract,
          status: status === "ended" ? "ended" : contract.status,
          computedStatus: status,
          daysUntilRenewal,
        };
      });
    },
    enabled: !!clientId,
  });
}

// Create contract with optimistic update
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContractInput) => {
      const { modules, ...contractData } = input;
      
      const { data: contract, error } = await supabase
        .from("contracts")
        .insert(contractData)
        .select()
        .single();

      if (error) throw error;

      if (modules && modules.length > 0) {
        const moduleInserts = modules.map(moduleId => ({
          contract_id: contract.id,
          module_id: moduleId,
        }));
        await supabase.from("contract_modules").insert(moduleInserts);
      }

      return contract;
    },
    onMutate: async (input) => {
      const { modules, ...contractData } = input;
      await queryClient.cancelQueries({ queryKey: ["client_contracts_full", input.client_id] });
      const previous = queryClient.getQueryData(["client_contracts_full", input.client_id]);

      const optimistic = {
        id: `temp-${Date.now()}`,
        ...contractData,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        modules: [],
      } as unknown as ContractWithModules;

      queryClient.setQueryData(["client_contracts_full", input.client_id], (old: ContractWithModules[] | undefined) => {
        const { status, daysUntilRenewal } = computeContractStatus(optimistic);
        return old ? [{ ...optimistic, computedStatus: status, daysUntilRenewal }, ...old] : [{ ...optimistic, computedStatus: status, daysUntilRenewal }];
      });

      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["client_contracts_full", variables.client_id], context.previous);
      }
      toast.error("Erro ao criar contrato: " + error.message);
    },
    onSuccess: () => {
      toast.success("Contrato criado com sucesso");
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client_contracts_full", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// Update contract with optimistic update
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateContractInput) => {
      const { id, ...updateData } = input;
      const { data, error } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["client_contracts_full"] });
      const allQueries = queryClient.getQueriesData({ queryKey: ["client_contracts_full"] });

      // Optimistically update all matching caches
      queryClient.setQueriesData(
        { queryKey: ["client_contracts_full"] },
        (old: ContractWithModules[] | undefined) => {
          if (!old) return old;
          return old.map((c) => (c.id === input.id ? { ...c, ...input } : c));
        }
      );

      return { allQueries };
    },
    onError: (error, _vars, context) => {
      context?.allQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Erro ao atualizar contrato: " + error.message);
    },
    onSuccess: () => {
      toast.success("Contrato atualizado");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["client_contracts_full"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// Delete contract
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_contracts_full"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato removido");
    },
    onError: (error) => {
      toast.error("Erro ao remover contrato: " + error.message);
    },
  });
}
