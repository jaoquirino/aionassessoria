import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Get the team member linked to the current user
export function useCurrentTeamMember() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current_team_member", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Link current user to a team member
export function useLinkToTeamMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (teamMemberId: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("team_members")
        .update({ user_id: user.id })
        .eq("id", teamMemberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current_team_member"] });
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Conta vinculada com sucesso! Você agora pode ser atribuído a tarefas.");
    },
    onError: (error) => {
      toast.error("Erro ao vincular conta: " + error.message);
    },
  });
}

// Unlink user from team member
export function useUnlinkTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamMemberId: string) => {
      const { data, error } = await supabase
        .from("team_members")
        .update({ user_id: null })
        .eq("id", teamMemberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current_team_member"] });
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Conta desvinculada");
    },
    onError: (error) => {
      toast.error("Erro ao desvincular: " + error.message);
    },
  });
}
