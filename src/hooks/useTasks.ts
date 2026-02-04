import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { 
  Task, 
  TaskChecklistItem, 
  TaskAttachment, 
  TaskHistory,
  CreateTaskInput, 
  UpdateTaskInput,
  TaskStatusDB,
  TeamMember,
  Client,
  ServiceModule,
  ContractModule,
  Contract
} from "@/types/tasks";
import { toast } from "sonner";

// Fetch all tasks with related data (uses public view for team_members to avoid RLS issues)
export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      // Fetch tasks with client/contract info (no team_members join to avoid RLS permission error)
      const { data: tasksData, error } = await supabase
        .from("tasks")
        .select(`
          *,
          client:clients(*),
          contract:contracts(*),
          contract_module:contract_modules(
            *,
            service_module:service_modules(*)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch team members separately via public view
      const { data: teamMembers } = await supabase
        .from("team_members_public")
        .select("*");

      const membersMap = new Map(teamMembers?.map(m => [m.id, m]) || []);

      // Map assignee and creator
      const tasks = tasksData?.map(task => ({
        ...task,
        assignee: task.assigned_to ? membersMap.get(task.assigned_to) || null : null,
        creator: task.created_by ? membersMap.get(task.created_by) || null : null,
      })) || [];

      return tasks as Task[];
    },
    staleTime: 30000,
    gcTime: 300000,
  });
}

// Fetch single task with all details
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          client:clients(*),
          contract:contracts(*),
          contract_module:contract_modules(
            *,
            service_module:service_modules(*)
          )
        `)
        .eq("id", taskId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Fetch team members separately
        const { data: teamMembers } = await supabase
          .from("team_members_public")
          .select("*");

        const membersMap = new Map(teamMembers?.map(m => [m.id, m]) || []);

        // Fetch checklist, attachments, and history
        const [checklistRes, attachmentsRes, historyRes] = await Promise.all([
          supabase.from("task_checklist").select("*").eq("task_id", taskId).order("order_index"),
          supabase.from("task_attachments").select("*").eq("task_id", taskId).order("created_at", { ascending: false }),
          supabase.from("task_history").select("*").eq("task_id", taskId).order("created_at", { ascending: false }),
        ]);

        return {
          ...data,
          assignee: data.assigned_to ? membersMap.get(data.assigned_to) || null : null,
          creator: data.created_by ? membersMap.get(data.created_by) || null : null,
          checklist: checklistRes.data || [],
          attachments: attachmentsRes.data || [],
          history: historyRes.data || [],
        } as Task;
      }

      return data as Task | null;
    },
    enabled: !!taskId,
  });
}

// Create task mutation
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { checklist, ...taskData } = input;
      
      // Insert task (weight is auto-calculated by trigger)
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          ...taskData,
          weight: 0, // Will be set by trigger
        })
        .select()
        .single();

      if (error) throw error;

      // Insert checklist items if provided
      if (checklist && checklist.length > 0) {
        const checklistItems = checklist.map((text, index) => ({
          task_id: task.id,
          item_text: text,
          order_index: index,
        }));

        await supabase.from("task_checklist").insert(checklistItems);
      }

      // Log creation in history
      await supabase.from("task_history").insert({
        task_id: task.id,
        action_type: "created",
        new_value: task.title,
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar tarefa: " + error.message);
    },
  });
}

// Update task mutation
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, ...updateData } = input;
      
      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
      toast.success("Tarefa atualizada");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tarefa: " + error.message);
    },
  });
}

// Update task status
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatusDB }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa excluída");
    },
    onError: (error) => {
      toast.error("Erro ao excluir tarefa: " + error.message);
    },
  });
}

// Checklist mutations
export function useAddChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, text }: { taskId: string; text: string }) => {
      // Get max order_index
      const { data: existing } = await supabase
        .from("task_checklist")
        .select("order_index")
        .eq("task_id", taskId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0;

      const { data, error } = await supabase
        .from("task_checklist")
        .insert({ task_id: taskId, item_text: text, order_index: nextIndex })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isCompleted, taskId }: { itemId: string; isCompleted: boolean; taskId: string }) => {
      const { data, error } = await supabase
        .from("task_checklist")
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, taskId }: { itemId: string; taskId: string }) => {
      const { error } = await supabase.from("task_checklist").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
    },
  });
}

// Add attachment (link)
export function useAddAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, fileName, fileUrl, fileType }: { taskId: string; fileName: string; fileUrl: string; fileType?: string }) => {
      const { data, error } = await supabase
        .from("task_attachments")
        .insert({ task_id: taskId, file_name: fileName, file_url: fileUrl, file_type: fileType || "link" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      toast.success("Anexo adicionado");
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, taskId }: { attachmentId: string; taskId: string }) => {
      const { error } = await supabase.from("task_attachments").delete().eq("id", attachmentId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      toast.success("Anexo removido");
    },
  });
}

// Add comment to history
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: string; comment: string }) => {
      const { data, error } = await supabase
        .from("task_history")
        .insert({ task_id: taskId, action_type: "comment", comment })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
    },
  });
}

// Fetch team members (public view without email for security)
export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      // Use the public view that excludes sensitive email data
      const { data, error } = await supabase
        .from("team_members_public")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      // Map to TeamMember type with null email (not exposed in view)
      return (data as Array<Omit<TeamMember, "email">>).map(member => ({
        ...member,
        email: null
      })) as TeamMember[];
    },
    staleTime: 60000,
  });
}

// Fetch active clients
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as Client[];
    },
    staleTime: 60000,
  });
}

// Fetch contracts for a client
export function useClientContracts(clientId: string | null) {
  return useQuery({
    queryKey: ["contracts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "active");

      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!clientId,
  });
}

// Fetch contract modules
export function useContractModules(contractId: string | null) {
  return useQuery({
    queryKey: ["contract_modules", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      
      const { data, error } = await supabase
        .from("contract_modules")
        .select(`
          *,
          service_module:service_modules(*)
        `)
        .eq("contract_id", contractId);

      if (error) throw error;
      return data as ContractModule[];
    },
    enabled: !!contractId,
  });
}

// Fetch service modules
export function useServiceModules() {
  return useQuery({
    queryKey: ["service_modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_modules")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as ServiceModule[];
    },
    staleTime: 60000,
  });
}
