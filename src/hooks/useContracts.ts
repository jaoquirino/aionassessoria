import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
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
}

function computeContractStatus(contract: Contract): { status: "active" | "expiring_soon" | "renewing" | "ended"; daysUntilRenewal: number } {
  if (contract.status === "ended") {
    return { status: "ended", daysUntilRenewal: 0 };
  }
  
  const renewalDate = contract.renewal_date ? parseLocalDate(contract.renewal_date) : null;
  const daysUntilRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : 999;
  
  if (daysUntilRenewal <= 7) {
    return { status: "renewing", daysUntilRenewal };
  }
  if (daysUntilRenewal <= 30) {
    return { status: "expiring_soon", daysUntilRenewal };
  }
  return { status: "active", daysUntilRenewal };
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
      
      return (data as ContractWithModules[]).map(contract => {
        const { status, daysUntilRenewal } = computeContractStatus(contract);
        return {
          ...contract,
          computedStatus: status,
          daysUntilRenewal,
        };
      });
    },
    enabled: !!clientId,
  });
}

// Create contract
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

      // Add modules if provided
      if (modules && modules.length > 0) {
        const moduleInserts = modules.map(moduleId => ({
          contract_id: contract.id,
          module_id: moduleId,
        }));
        
        await supabase.from("contract_modules").insert(moduleInserts);
      }

      return contract;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client_contracts_full", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar contrato: " + error.message);
    },
  });
}

// Update contract
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_contracts_full"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar contrato: " + error.message);
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
