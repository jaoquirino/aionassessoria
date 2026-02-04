import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  permission: string;
  avatar_url: string | null;
  capacity_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamMemberInput {
  name: string;
  email?: string;
  role: string;
  permission?: string;
  capacity_limit?: number;
}

export interface UpdateTeamMemberInput {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  permission?: string;
  capacity_limit?: number;
  is_active?: boolean;
}

// Fetch all team members with their task weights
export function useAllTeamMembers() {
  return useQuery({
    queryKey: ["all_team_members"],
    queryFn: async () => {
      // Fetch members first (includes user_id for linking)
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .order("name");

      if (membersError) throw membersError;

      // Only fetch tasks if we have members
      if (!members || members.length === 0) {
        return [];
      }

      // Fetch only necessary task data with limit and filter
      const { data: tasks } = await supabase
        .from("tasks")
        .select("assigned_to, weight, status, due_date")
        .not("status", "eq", "done")
        .not("assigned_to", "is", null)
        .is("archived_at", null)
        .neq("type", "project"); // Exclude onboarding tasks

      const memberWeights = new Map<string, { currentWeight: number; activeTasks: number; overdueTasks: number }>();
      
      tasks?.forEach(task => {
        if (task.assigned_to) {
          const current = memberWeights.get(task.assigned_to) || { currentWeight: 0, activeTasks: 0, overdueTasks: 0 };
          current.currentWeight += task.weight;
          current.activeTasks += 1;
          if (new Date(task.due_date) < new Date() && task.status !== "done") {
            current.overdueTasks += 1;
          }
          memberWeights.set(task.assigned_to, current);
        }
      });

      return (members as TeamMember[]).map(member => ({
        ...member,
        currentWeight: memberWeights.get(member.id)?.currentWeight || 0,
        activeTasks: memberWeights.get(member.id)?.activeTasks || 0,
        overdueTasks: memberWeights.get(member.id)?.overdueTasks || 0,
      }));
    },
    staleTime: 60000,
    gcTime: 300000,
  });
}

// Create team member
export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTeamMemberInput) => {
      const { data, error } = await supabase
        .from("team_members")
        .insert({
          name: input.name,
          email: input.email || null,
          role: input.role,
          permission: input.permission || "operational",
          capacity_limit: input.capacity_limit || 15,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Membro adicionado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar membro: " + error.message);
    },
  });
}

// Update team member
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTeamMemberInput) => {
      const { id, ...updateData } = input;
      const { data, error } = await supabase
        .from("team_members")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Membro atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar membro: " + error.message);
    },
  });
}

// Delete team member
export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Membro removido");
    },
    onError: (error) => {
      toast.error("Erro ao remover membro: " + error.message);
    },
  });
}
