import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FreelancerRate {
  id: string;
  team_member_id: string;
  module_id: string;
  deliverable_type: string | null;
  rate_per_unit: number;
  created_at: string;
  updated_at: string;
  module?: { id: string; name: string } | null;
}

export function useFreelancerRates(teamMemberId?: string) {
  return useQuery({
    queryKey: ["freelancer_rates", teamMemberId],
    enabled: !!teamMemberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_rates")
        .select("*, module:service_modules(id, name)")
        .eq("team_member_id", teamMemberId!)
        .order("created_at");
      if (error) throw error;
      return data as FreelancerRate[];
    },
  });
}

export function useUpsertFreelancerRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      team_member_id: string;
      module_id: string;
      deliverable_type: string | null;
      rate_per_unit: number;
    }) => {
      // Try update first, then insert
      const { data: existing } = await supabase
        .from("freelancer_rates")
        .select("id")
        .eq("team_member_id", input.team_member_id)
        .eq("module_id", input.module_id)
        .is("deliverable_type", input.deliverable_type)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("freelancer_rates")
          .update({ rate_per_unit: input.rate_per_unit })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("freelancer_rates")
          .insert(input);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["freelancer_rates", vars.team_member_id] });
      toast.success("Valor atualizado");
    },
    onError: () => toast.error("Erro ao salvar valor"),
  });
}

export function useDeleteFreelancerRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teamMemberId }: { id: string; teamMemberId: string }) => {
      const { error } = await supabase.from("freelancer_rates").delete().eq("id", id);
      if (error) throw error;
      return teamMemberId;
    },
    onSuccess: (teamMemberId) => {
      queryClient.invalidateQueries({ queryKey: ["freelancer_rates", teamMemberId] });
      toast.success("Valor removido");
    },
    onError: () => toast.error("Erro ao remover valor"),
  });
}
