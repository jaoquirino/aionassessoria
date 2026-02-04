import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OnboardingResponse {
  id: string;
  client_id: string;
  contract_module_id: string;
  template_step_id: string;
  response_value: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStepWithResponse {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  responsible_role: string;
  response_type: string;
  response_required: boolean;
  response?: OnboardingResponse;
}

// Fetch onboarding responses for a client module
export function useClientOnboardingResponses(clientId: string | null, contractModuleId: string | null) {
  return useQuery({
    queryKey: ["onboarding_responses", clientId, contractModuleId],
    queryFn: async () => {
      if (!clientId || !contractModuleId) return [];
      
      const { data, error } = await supabase
        .from("client_onboarding_responses")
        .select("*")
        .eq("client_id", clientId)
        .eq("contract_module_id", contractModuleId)
        .order("created_at");

      if (error) throw error;
      return data as OnboardingResponse[];
    },
    enabled: !!clientId && !!contractModuleId,
  });
}

// Fetch all onboarding responses for a client (across all modules)
export function useAllClientOnboardingResponses(clientId: string | null) {
  return useQuery({
    queryKey: ["all_onboarding_responses", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("client_onboarding_responses")
        .select(`
          *,
          template_step:onboarding_template_steps(
            id, title, description, order_index, responsible_role, response_type, response_required
          )
        `)
        .eq("client_id", clientId)
        .order("created_at");

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

// Upsert response with optimistic update
export function useUpsertOnboardingResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      contract_module_id: string;
      template_step_id: string;
      response_value?: string;
      is_completed?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("client_onboarding_responses")
        .upsert({
          client_id: input.client_id,
          contract_module_id: input.contract_module_id,
          template_step_id: input.template_step_id,
          response_value: input.response_value ?? null,
          is_completed: input.is_completed ?? false,
          completed_at: input.is_completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "client_id,contract_module_id,template_step_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ["onboarding_responses", variables.client_id, variables.contract_module_id] 
      });

      // Snapshot previous value
      const previousResponses = queryClient.getQueryData([
        "onboarding_responses", variables.client_id, variables.contract_module_id
      ]);

      // Optimistically update
      queryClient.setQueryData(
        ["onboarding_responses", variables.client_id, variables.contract_module_id],
        (old: OnboardingResponse[] | undefined) => {
          if (!old) return old;
          const existingIndex = old.findIndex(
            r => r.template_step_id === variables.template_step_id
          );
          const newResponse = {
            id: `temp-${Date.now()}`,
            client_id: variables.client_id,
            contract_module_id: variables.contract_module_id,
            template_step_id: variables.template_step_id,
            response_value: variables.response_value ?? null,
            is_completed: variables.is_completed ?? false,
            completed_at: variables.is_completed ? new Date().toISOString() : null,
            completed_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          if (existingIndex >= 0) {
            const updated = [...old];
            updated[existingIndex] = { ...old[existingIndex], ...newResponse };
            return updated;
          }
          return [...old, newResponse];
        }
      );

      return { previousResponses };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousResponses) {
        queryClient.setQueryData(
          ["onboarding_responses", variables.client_id, variables.contract_module_id],
          context.previousResponses
        );
      }
      console.error("Erro no upsert de onboarding response:", error);
      toast.error("Erro ao salvar resposta: " + (error as Error).message);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["onboarding_responses", variables.client_id, variables.contract_module_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["all_onboarding_responses", variables.client_id] 
      });
      queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress"] });
    },
  });
}

// Bulk update responses
export function useBulkUpdateResponses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responses: Array<{
      client_id: string;
      contract_module_id: string;
      template_step_id: string;
      response_value?: string;
      is_completed?: boolean;
    }>) => {
      const { data, error } = await supabase
        .from("client_onboarding_responses")
        .upsert(
          responses.map(r => ({
            client_id: r.client_id,
            contract_module_id: r.contract_module_id,
            template_step_id: r.template_step_id,
            response_value: r.response_value ?? null,
            is_completed: r.is_completed ?? false,
            completed_at: r.is_completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "client_id,contract_module_id,template_step_id" }
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_responses"] });
      queryClient.invalidateQueries({ queryKey: ["all_onboarding_responses"] });
      queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress"] });
      toast.success("Respostas salvas");
    },
    onError: (error) => {
      toast.error("Erro ao salvar respostas: " + error.message);
    },
  });
}
