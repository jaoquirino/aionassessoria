import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentPeriod {
  id: string;
  team_member_id: string;
  start_date: string;
  end_date: string;
  status: "draft" | "pending_approval" | "approved" | "paid";
  total_amount: number;
  approved_at: string | null;
  paid_at: string | null;
  financial_transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  team_member?: { id: string; name: string; avatar_url: string | null } | null;
  tasks?: PaymentPeriodTask[];
}

export interface PaymentPeriodTask {
  id: string;
  payment_period_id: string;
  task_id: string;
  amount: number;
  is_included: boolean;
  created_at: string;
  task?: {
    id: string;
    title: string;
    deliverable_type: string | null;
    status: string;
    client_id: string;
    contract_module_id: string | null;
    updated_at: string;
    client?: { name: string } | null;
    contract_module?: { module_id: string; module?: { name: string } | null } | null;
  } | null;
}

export function usePaymentPeriods(filters?: { teamMemberId?: string; status?: string }) {
  return useQuery({
    queryKey: ["payment_periods", filters],
    queryFn: async () => {
      let query = supabase
        .from("payment_periods")
        .select("*, team_member:team_members(id, name, avatar_url)")
        .order("created_at", { ascending: false });

      if (filters?.teamMemberId) query = query.eq("team_member_id", filters.teamMemberId);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentPeriod[];
    },
  });
}

export function usePaymentPeriodTasks(periodId?: string) {
  return useQuery({
    queryKey: ["payment_period_tasks", periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_period_tasks")
        .select(`
          *,
          task:tasks(
            id, title, deliverable_type, status, client_id, contract_module_id, updated_at,
            client:clients(name),
            contract_module:contract_modules(module_id, module:service_modules(name))
          )
        `)
        .eq("payment_period_id", periodId!)
        .order("created_at");
      if (error) throw error;
      return data as PaymentPeriodTask[];
    },
  });
}

// Generate a payment period for a freelancer based on completed tasks
export function useGeneratePaymentPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      team_member_id: string;
      start_date: string;
      end_date: string;
    }) => {
      // 1. Find completed tasks in the period assigned to this member
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, deliverable_type, contract_module_id, updated_at, client_id")
        .eq("status", "done")
        .gte("updated_at", input.start_date + "T00:00:00")
        .lte("updated_at", input.end_date + "T23:59:59")
        .is("archived_at", null);

      if (tasksError) throw tasksError;

      // Filter tasks assigned to this member (via assigned_to or task_assignees)
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("team_member_id", input.team_member_id);

      const assigneeTaskIds = new Set(assignees?.map(a => a.task_id) || []);

      const { data: directTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("assigned_to", input.team_member_id)
        .eq("status", "done")
        .gte("updated_at", input.start_date + "T00:00:00")
        .lte("updated_at", input.end_date + "T23:59:59")
        .is("archived_at", null);

      const directTaskIds = new Set(directTasks?.map(t => t.id) || []);

      const memberTasks = (tasks || []).filter(
        t => directTaskIds.has(t.id) || assigneeTaskIds.has(t.id)
      );

      // Check tasks not already in a paid period
      const taskIds = memberTasks.map(t => t.id);
      let alreadyPaid = new Set<string>();
      if (taskIds.length > 0) {
        const { data: existingPPT } = await supabase
          .from("payment_period_tasks")
          .select("task_id, payment_period:payment_periods!inner(status)")
          .in("task_id", taskIds);

        existingPPT?.forEach(ppt => {
          const pp = ppt.payment_period as any;
          if (pp?.status === "paid" || pp?.status === "approved") {
            alreadyPaid.add(ppt.task_id);
          }
        });
      }

      const eligibleTasks = memberTasks.filter(t => !alreadyPaid.has(t.id));

      if (eligibleTasks.length === 0) {
        throw new Error("Nenhuma tarefa elegível encontrada neste período");
      }

      // 2. Get freelancer rates
      const { data: rates } = await supabase
        .from("freelancer_rates")
        .select("*")
        .eq("team_member_id", input.team_member_id);

      // 3. Calculate amounts
      const rateMap = new Map<string, number>();
      rates?.forEach(r => {
        const key = r.deliverable_type
          ? `${r.module_id}:${r.deliverable_type}`
          : `${r.module_id}:*`;
        rateMap.set(key, Number(r.rate_per_unit));
      });

      // Get module_id for tasks with contract_module_id
      const moduleIds = [...new Set(eligibleTasks.filter(t => t.contract_module_id).map(t => t.contract_module_id!))];
      const { data: contractModules } = moduleIds.length > 0
        ? await supabase.from("contract_modules").select("id, module_id").in("id", moduleIds)
        : { data: [] as Array<{ id: string; module_id: string }> };

      const cmToModule = new Map<string, string>();
      contractModules?.forEach(cm => cmToModule.set(cm.id, cm.module_id));

      const taskAmounts = eligibleTasks.map(task => {
        const moduleId = task.contract_module_id ? cmToModule.get(task.contract_module_id) : null;
        let amount = 0;
        if (moduleId) {
          // Try specific deliverable_type rate first
          if (task.deliverable_type) {
            amount = rateMap.get(`${moduleId}:${task.deliverable_type}`) || 0;
          }
          // Fallback to module-level rate
          if (amount === 0) {
            amount = rateMap.get(`${moduleId}:*`) || 0;
          }
        }
        return { task_id: task.id, amount };
      });

      const totalAmount = taskAmounts.reduce((sum, t) => sum + t.amount, 0);

      // 4. Create payment period
      const { data: period, error: periodError } = await supabase
        .from("payment_periods")
        .insert({
          team_member_id: input.team_member_id,
          start_date: input.start_date,
          end_date: input.end_date,
          total_amount: totalAmount,
          status: "draft",
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // 5. Create payment period tasks
      if (taskAmounts.length > 0) {
        const { error: pptError } = await supabase
          .from("payment_period_tasks")
          .insert(
            taskAmounts.map(ta => ({
              payment_period_id: period.id,
              task_id: ta.task_id,
              amount: ta.amount,
              is_included: true,
            }))
          );
        if (pptError) throw pptError;
      }

      return period;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment_periods"] });
      toast.success("Período de pagamento gerado");
    },
    onError: (error) => toast.error(error.message || "Erro ao gerar período"),
  });
}

// Update payment period status
export function useUpdatePaymentPeriodStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: "draft" | "pending_approval" | "approved" | "paid";
      total_amount?: number;
    }) => {
      const updates: any = { status: input.status };
      if (input.status === "approved") updates.approved_at = new Date().toISOString();
      if (input.status === "paid") updates.paid_at = new Date().toISOString();
      if (input.total_amount !== undefined) updates.total_amount = input.total_amount;

      const { data: period, error } = await supabase
        .from("payment_periods")
        .update(updates)
        .eq("id", input.id)
        .select("*, team_member:team_members(id, name)")
        .single();

      if (error) throw error;

      // If paid, create financial transaction
      if (input.status === "paid" && period) {
        const memberName = (period.team_member as any)?.name || "Freelancer";
        const { data: transaction, error: txError } = await supabase
          .from("financial_transactions")
          .insert({
            type: "expense",
            amount: period.total_amount,
            description: `Pagamento freelancer - ${memberName}`,
            date: new Date().toISOString().split("T")[0],
            is_auto_generated: true,
          })
          .select()
          .single();

        if (!txError && transaction) {
          await supabase
            .from("payment_periods")
            .update({ financial_transaction_id: transaction.id })
            .eq("id", period.id);
        }
      }

      return period;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["payment_periods"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      const msgs: Record<string, string> = {
        pending_approval: "Enviado para aprovação",
        approved: "Pagamento aprovado",
        paid: "Pagamento registrado e lançamento financeiro gerado",
        draft: "Voltou para rascunho",
      };
      toast.success(msgs[vars.status] || "Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });
}

// Send approval notification to freelancer
export function useSendApprovalNotification() {
  return useMutation({
    mutationFn: async (input: { periodId: string; teamMemberId: string }) => {
      // Get team member's user_id
      const { data: member } = await supabase
        .from("team_members")
        .select("user_id, name")
        .eq("id", input.teamMemberId)
        .single();

      if (!member?.user_id) throw new Error("Freelancer não possui conta no sistema");

      // Create notification
      const { error } = await supabase.from("notifications").insert({
        user_id: member.user_id,
        type: "payment_approval",
        title: "Aprovação de pagamento",
        detail: `Um período de pagamento foi gerado para você. Revise e aprove os valores.`,
        task_id: null,
      });

      if (error) throw error;
    },
    onError: (error) => toast.error(error.message || "Erro ao enviar notificação"),
  });
}
