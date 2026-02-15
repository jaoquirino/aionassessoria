import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/tasks";
import { toast } from "sonner";
import { useMemo } from "react";

export type SubtaskCounts = Record<string, { total: number; done: number; weight: number }>;

export function useTasksSubtaskCounts(taskIds: string[]) {
  const stableKey = useMemo(() => [...taskIds].sort().join(","), [taskIds]);

  return useQuery({
    queryKey: ["subtask_counts", stableKey],
    queryFn: async () => {
      if (!taskIds.length) return {} as SubtaskCounts;

      const { data, error } = await supabase
        .from("tasks")
        .select("parent_task_id, status, weight")
        .in("parent_task_id", taskIds)
        .is("archived_at", null);

      if (error) throw error;

      const counts: SubtaskCounts = {};
      data?.forEach((row) => {
        const pid = row.parent_task_id!;
        if (!counts[pid]) counts[pid] = { total: 0, done: 0, weight: 0 };
        counts[pid].total++;
        if (row.status === "done") counts[pid].done++;
        if (row.status !== "done") counts[pid].weight += row.weight;
      });
      return counts;
    },
    enabled: taskIds.length > 0,
  });
}

export function useSubtasks(parentTaskId: string | null) {
  return useQuery({
    queryKey: ["subtasks", parentTaskId],
    queryFn: async () => {
      if (!parentTaskId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("parent_task_id", parentTaskId)
        .is("archived_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!parentTaskId,
  });
}

export function useAddSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentTask,
      title,
    }: {
      parentTask: Task;
      title: string;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title,
          parent_task_id: parentTask.id,
          client_id: parentTask.client_id,
          contract_id: parentTask.contract_id,
          contract_module_id: parentTask.contract_module_id,
          type: parentTask.type,
          required_role: parentTask.required_role,
          assigned_to: parentTask.assigned_to,
          due_date: parentTask.due_date,
          status: "todo",
          weight: 0, // Will be set by trigger based on module
          priority: parentTask.priority || "medium",
          is_deliverable: parentTask.is_deliverable,
          deliverable_type: parentTask.deliverable_type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ parentTask, title }) => {
      const queryKey = ["subtasks", parentTask.id];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      const optimistic: Task = {
        id: `temp-${Date.now()}`,
        title,
        parent_task_id: parentTask.id,
        client_id: parentTask.client_id,
        contract_id: parentTask.contract_id,
        contract_module_id: parentTask.contract_module_id,
        type: parentTask.type,
        required_role: parentTask.required_role,
        assigned_to: parentTask.assigned_to,
        created_by: null,
        due_date: parentTask.due_date,
        status: "todo",
        weight: parentTask.weight,
        priority: parentTask.priority || "medium",
        description_objective: null,
        description_deliverable: null,
        description_references: null,
        description_notes: null,
        is_deliverable: parentTask.is_deliverable,
        deliverable_type: parentTask.deliverable_type,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKey, (old: Task[] | undefined) =>
        old ? [...old, optimistic] : [optimistic]
      );

      return { previous };
    },
    onError: (_, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["subtasks", variables.parentTask.id],
          context.previous
        );
      }
      toast.error("Erro ao criar subtarefa");
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["subtasks", variables.parentTask.id],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtask_counts"] });
    },
  });
}

export function useToggleSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subtaskId,
      parentTaskId,
      isDone,
    }: {
      subtaskId: string;
      parentTaskId: string;
      isDone: boolean;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: isDone ? "done" : "todo" })
        .eq("id", subtaskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ subtaskId, parentTaskId, isDone }) => {
      const queryKey = ["subtasks", parentTaskId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map((t) =>
          t.id === subtaskId ? { ...t, status: isDone ? "done" : "todo" } : t
        );
      });

      return { previous };
    },
    onError: (_, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["subtasks", variables.parentTaskId],
          context.previous
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["subtasks", variables.parentTaskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtask_counts"] });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subtaskId,
      parentTaskId,
      updates,
    }: {
      subtaskId: string;
      parentTaskId: string;
      updates: Partial<Task>;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates as any)
        .eq("id", subtaskId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ subtaskId, parentTaskId, updates }) => {
      const queryKey = ["subtasks", parentTaskId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map((t) =>
          t.id === subtaskId ? { ...t, ...updates } : t
        );
      });

      return { previous };
    },
    onError: (_, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["subtasks", variables.parentTaskId],
          context.previous
        );
      }
      toast.error("Erro ao atualizar subtarefa");
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["subtasks", variables.parentTaskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtask_counts"] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subtaskId,
      parentTaskId,
    }: {
      subtaskId: string;
      parentTaskId: string;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", subtaskId);
      if (error) throw error;
    },
    onMutate: async ({ subtaskId, parentTaskId }) => {
      const queryKey = ["subtasks", parentTaskId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: Task[] | undefined) => {
        if (!old) return old;
        return old.filter((t) => t.id !== subtaskId);
      });

      return { previous };
    },
    onError: (_, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["subtasks", variables.parentTaskId],
          context.previous
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["subtasks", variables.parentTaskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtask_counts"] });
    },
  });
}
