import { useEffect } from "react";
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
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime:team")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        () => queryClient.invalidateQueries({ queryKey: ["all_team_members"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => queryClient.invalidateQueries({ queryKey: ["all_team_members"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        () => queryClient.invalidateQueries({ queryKey: ["all_team_members"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["all_team_members"],
    queryFn: async () => {
      const { data: membersRaw, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (membersError) throw membersError;

      const members = membersRaw || [];

      if (!members || members.length === 0) return [];

      // Buscar tarefas (para peso/contagem) e assignees (multi-responsáveis)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, assigned_to, weight, status, due_date, type")
        .not("status", "eq", "done")
        .is("archived_at", null)
        .neq("type", "project");

      const taskIds = tasks?.map((t) => t.id) || [];

      const { data: assignees } = taskIds.length
        ? await supabase
            .from("task_assignees")
            .select("task_id, team_member_id")
            .in("task_id", taskIds)
        : { data: [] as Array<{ task_id: string; team_member_id: string }> };

      // Mapa task_id -> memberIds
      const assigneesByTask = new Map<string, string[]>();
      assignees?.forEach((a) => {
        const arr = assigneesByTask.get(a.task_id) || [];
        arr.push(a.team_member_id);
        assigneesByTask.set(a.task_id, arr);
      });

      const memberWeights = new Map<
        string,
        { currentWeight: number; activeTasks: number; overdueTasks: number }
      >();

      const now = new Date();

      tasks?.forEach((task) => {
        const targets = new Set<string>();
        if (task.assigned_to) targets.add(task.assigned_to);
        (assigneesByTask.get(task.id) || []).forEach((id) => targets.add(id));

        targets.forEach((memberId) => {
          const current =
            memberWeights.get(memberId) ||
            { currentWeight: 0, activeTasks: 0, overdueTasks: 0 };

          current.currentWeight += task.weight;
          current.activeTasks += 1;

          // due_date é YYYY-MM-DD: comparar em local
          const [y, m, d] = String(task.due_date).split("-").map(Number);
          const due = new Date(y, m - 1, d);
          if (due < now) current.overdueTasks += 1;

          memberWeights.set(memberId, current);
        });
      });

      return (members as TeamMember[]).map((member) => ({
        ...member,
        currentWeight: memberWeights.get(member.id)?.currentWeight || 0,
        activeTasks: memberWeights.get(member.id)?.activeTasks || 0,
        overdueTasks: memberWeights.get(member.id)?.overdueTasks || 0,
      }));
    },
    staleTime: 10000,
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
      toast.success("Integrante adicionado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar integrante: " + error.message);
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
      toast.success("Integrante atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar integrante: " + error.message);
    },
  });
}

// Deactivate team member (set to "no access" mode)
export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      // Get the team member to find user_id
      const { data: member } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("id", memberId)
        .single();

      // Set team member as inactive
      const { error: updateError } = await supabase
        .from("team_members")
        .update({ is_active: false })
        .eq("id", memberId);

      if (updateError) throw updateError;

      // If has user_id, remove from user_roles (set to "no access")
      if (member?.user_id) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", member.user_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast.success("Integrante movido para 'Sem acesso'");
    },
    onError: (error) => {
      toast.error("Erro ao remover integrante: " + error.message);
    },
  });
}
