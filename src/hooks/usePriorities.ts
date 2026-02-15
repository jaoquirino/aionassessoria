import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Priority {
  id: string;
  key: string;
  label: string;
  color: string;
  order_index: number;
  is_default: boolean;
}

export type PriorityConfig = Record<string, { label: string; color: string; order: number }>;

export function usePriorities() {
  return useQuery({
    queryKey: ["task_priorities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_priorities")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Priority[];
    },
  });
}

/** Returns a config map like the old hardcoded priorityConfig, using DB data */
export function usePriorityConfig(): PriorityConfig {
  const { data: priorities } = usePriorities();
  if (!priorities?.length) {
    // Fallback to defaults while loading
    return {
      low: { label: "Baixa", color: "bg-emerald-500/25 text-emerald-600 dark:text-emerald-400", order: 4 },
      medium: { label: "Média", color: "bg-blue-500/25 text-blue-600 dark:text-blue-400", order: 3 },
      high: { label: "Alta", color: "bg-amber-500/25 text-amber-600 dark:text-amber-400", order: 2 },
      urgent: { label: "Pra ontem", color: "bg-red-500/25 text-red-600 dark:text-red-400", order: 1 },
    };
  }
  const config: PriorityConfig = {};
  priorities.forEach((p) => {
    config[p.key] = {
      label: p.label,
      color: `bg-[${p.color}]/25 text-[${p.color}]`,
      order: p.order_index,
    };
  });
  return config;
}

/** Returns priority keys ordered for popover selection */
export function usePriorityKeys(): string[] {
  const { data: priorities } = usePriorities();
  if (!priorities?.length) return ["low", "medium", "high", "urgent"];
  return priorities.map((p) => p.key);
}

export function useCreatePriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; label: string; color: string; order_index: number }) => {
      const { data, error } = await supabase
        .from("task_priorities")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_priorities"] });
      toast.success("Prioridade criada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Priority> & { id: string }) => {
      const { error } = await supabase
        .from("task_priorities")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_priorities"] });
      toast.success("Prioridade atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_priorities")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_priorities"] });
      toast.success("Prioridade removida");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
