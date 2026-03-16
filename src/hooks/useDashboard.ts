import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/utils";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";

export interface DashboardStats {
  overdueTasks: number;
  todayDeliveries: number;
  weekDeliveries: number;
  weekCompleted: number;
  activeClients: number;
  monthlyRevenue: number;
  totalWeight: number;
  totalCapacity: number;
  activeTasks: number;
}

export interface DashboardTask {
  id: string;
  title: string;
  clientName: string;
  clientLogo: string | null;
  assigneeName: string;
  assigneeAvatar: string | null;
  dueDate: string;
  status: string;
  isOverdue: boolean;
  weight: number;
  type: string;
  isSubtask: boolean;
  parentTaskId: string | null;
}

export interface DashboardTeamMember {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  currentWeight: number;
  maxWeight: number;
  tasksCount: number;
  overdueTasks: number;
}

export interface DashboardClientHealth {
  id: string;
  name: string;
  logo_url: string | null;
  monthlyValue: number;
  operationalWeight: number;
  deliveriesThisMonth: number;
  pendingTasks: number;
  healthStatus: "normal" | "attention" | "critical";
  designDeliverables: number;
  designLimit: number | null;
  arteCount: number;
  videoCount: number;
  delivered: number;
}

export interface ClientTask {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  type: string;
  isSubtask: boolean;
  parentTaskId: string | null;
  assigneeName: string;
  deliverableType: string | null;
  clientName: string;
  clientLogo: string | null;
  moduleName: string | null;
}

export function useDashboardData() {
  const { data: currentMember } = useCurrentTeamMember();
  const isAdmin = currentMember?.permission === "admin";
  const isRestricted = currentMember?.restricted_view === true;
  const currentMemberId = currentMember?.id;

  return useQuery({
    queryKey: ["dashboard", isAdmin, isRestricted, currentMemberId],
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Fetch all non-archived tasks (use range to bypass 1000 row limit)
      const fetchAllTasks = async () => {
        const allTasks: any[] = [];
        let from = 0;
        const batchSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .is("archived_at", null)
            .order("due_date")
            .range(from, from + batchSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allTasks.push(...data);
          if (data.length < batchSize) break;
          from += batchSize;
        }
        return allTasks;
      };

      const [tasks, clientsRes, contractsRes, teamMembersRes, contractModulesRes, taskAssigneesRes] = await Promise.all([
        fetchAllTasks(),
        supabase.from("clients").select("*, is_internal"),
        supabase.from("contracts").select("*, client:clients(name)").eq("status", "active"),
        supabase.from("team_members_public").select("*").eq("is_active", true),
        supabase.from("contract_modules").select("*, service_module:service_modules(name, primary_role), contract:contracts(client_id, status)"),
        supabase.from("task_assignees").select("task_id, team_member_id"),
      ]);

      const clients = clientsRes.data || [];
      const contracts = contractsRes.data || [];
      const teamMembers = teamMembersRes.data || [];
      const contractModules = contractModulesRes.data || [];
      const taskAssignees = taskAssigneesRes.data || [];

      // Build a map of task_id -> team_member_ids
      const taskAssigneeMap = new Map<string, string[]>();
      taskAssignees.forEach((ta: { task_id: string; team_member_id: string }) => {
        const existing = taskAssigneeMap.get(ta.task_id) || [];
        existing.push(ta.team_member_id);
        taskAssigneeMap.set(ta.task_id, existing);
      });

      // Create internal client IDs set
      const internalClientIds = new Set(
        clients.filter((c: { is_internal?: boolean }) => c.is_internal).map((c: { id: string }) => c.id)
      );

      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Filter tasks
      const operationalTasks = tasks.filter(t => t.type !== "onboarding");

      // Identify parent tasks that have subtasks — subtasks replace them in counts
      const parentIdsWithSubtasks = new Set(
        operationalTasks
          .filter(t => t.parent_task_id)
          .map(t => t.parent_task_id)
      );

      // Exclude parent tasks that have subtasks for accurate counting
      const operationalTasksFiltered = operationalTasks.filter(
        t => !parentIdsWithSubtasks.has(t.id)
      );
      const operationalTasksForWeight = operationalTasksFiltered.filter(t => !internalClientIds.has(t.client_id));

      // Stats: exclude internal clients and onboarding
      const overdueTasks = operationalTasksForWeight.filter(t => parseLocalDate(t.due_date) < todayMidnight && t.status !== "done").length;
      const todayDeliveries = operationalTasksForWeight.filter(t => {
        const due = parseLocalDate(t.due_date);
        return due.toDateString() === today.toDateString();
      }).length;
      const weekTasks = operationalTasksForWeight.filter(t => {
        const due = parseLocalDate(t.due_date);
        return due >= startOfWeek && due <= endOfWeek;
      });
      const weekDeliveries = weekTasks.length;
      const weekCompleted = weekTasks.filter(t => t.status === "done").length;
      const activeTasksCount = operationalTasksForWeight.filter(t => t.status !== "done").length;

      const activeClients = clients.filter(c => c.status === "active").length;
      const monthlyRevenue = contracts
        .filter((c: { client_id: string }) => !internalClientIds.has(c.client_id))
        .reduce((sum: number, c: { monthly_value: number }) => sum + Number(c.monthly_value), 0);

      // Member weights: match Team page logic exactly (exclude project type, include all clients, include subtask weights)
      const memberWeightTasks = operationalTasks.filter(t => t.type !== "project" && t.status !== "done");
      const memberTaskStats = new Map<string, { weight: number; count: number; overdue: number }>();
      memberWeightTasks.forEach(t => {
        const assignedMembers = new Set<string>();
        if (t.assigned_to) assignedMembers.add(t.assigned_to);
        const extraAssignees = taskAssigneeMap.get(t.id);
        if (extraAssignees) extraAssignees.forEach(id => assignedMembers.add(id));

        assignedMembers.forEach(memberId => {
          const curr = memberTaskStats.get(memberId) || { weight: 0, count: 0, overdue: 0 };
          curr.weight += t.weight;
          curr.count += 1;
          if (parseLocalDate(t.due_date) < todayMidnight) curr.overdue += 1;
          memberTaskStats.set(memberId, curr);
        });
      });

      const dashboardTeam: DashboardTeamMember[] = teamMembers.map(m => {
        const stats = memberTaskStats.get(m.id!) || { weight: 0, count: 0, overdue: 0 };
        return {
          id: m.id!,
          name: m.name || "—",
          role: m.role || "—",
          avatar_url: m.avatar_url,
          currentWeight: stats.weight,
          maxWeight: m.capacity_limit || 15,
          tasksCount: stats.count,
          overdueTasks: stats.overdue,
        };
      });

      // totalWeight = sum of member weights (matches Team page)
      const totalWeight = dashboardTeam.reduce((sum, m) => sum + m.currentWeight, 0);
      const totalCapacity = teamMembers.reduce((sum, m) => sum + (m.capacity_limit || 0), 0);

      // Map tasks for display
      const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));
      const clientMap = new Map(clients.map(c => [c.id, c.name]));
      const clientLogoMap = new Map(clients.map(c => [c.id, c.logo_url || null]));

      const getAssigneeName = (task: any) => {
        const assigneeIds = taskAssigneeMap.get(task.id) || [];
        if (task.assigned_to) assigneeIds.push(task.assigned_to);
        const uniqueIds = [...new Set(assigneeIds)];
        if (uniqueIds.length === 0) return "Não atribuído";
        const names = uniqueIds.map(id => memberMap.get(id)).filter(Boolean);
        return names.length > 0 ? names.join(", ") : "Não atribuído";
      };

      const activeTasks = operationalTasksForWeight.filter(t => t.status !== "done");
      const dashboardTasks: DashboardTask[] = activeTasks.map(t => ({
        id: t.id,
        title: t.title,
        clientName: clientMap.get(t.client_id) || "—",
        clientLogo: clientLogoMap.get(t.client_id) || null,
        assigneeName: getAssigneeName(t),
        assigneeAvatar: t.assigned_to ? (teamMembers.find(m => m.id === t.assigned_to)?.avatar_url || null) : null,
        dueDate: t.due_date,
        status: t.status,
        isOverdue: parseLocalDate(t.due_date) < todayMidnight && t.status !== "done",
        weight: t.weight,
        type: t.type,
        isSubtask: !!t.parent_task_id,
        parentTaskId: t.parent_task_id || null,
      }));

      // Client health - fixed to current month, only design deliveries (arte/vídeo),
      // matching Deliveries dashboard logic (subtasks count, parent with subtasks does not duplicate)
      const clientTaskStats2 = new Map<string, { weight: number; pending: number; delivered: number; designDeliverables: number; arteCount: number; videoCount: number; tasks: ClientTask[] }>();

      const healthTasks = operationalTasksFiltered.filter(t => !internalClientIds.has(t.client_id));

      healthTasks.forEach(t => {
        const curr = clientTaskStats2.get(t.client_id) || { weight: 0, pending: 0, delivered: 0, designDeliverables: 0, arteCount: 0, videoCount: 0, tasks: [] };
        const taskDue = parseLocalDate(t.due_date);
        const isCurrentMonth = taskDue >= startOfMonth && taskDue <= endOfMonth;
        const deliverableType = (t.deliverable_type || "").toLowerCase();
        const isDesignDeliverable = deliverableType === "arte" || deliverableType === "video" || deliverableType === "vídeo";

        // Keep operational weight behavior
        if (t.status !== "done") {
          curr.weight += t.weight;
        }

        // Health deliveries = design tasks in current month (any status), same as Deliveries total
        if (isCurrentMonth && isDesignDeliverable) {
          curr.designDeliverables += 1;
          if (deliverableType === "arte") curr.arteCount += 1;
          else curr.videoCount += 1;
          if (t.status === "done") curr.delivered += 1;
          else curr.pending += 1;

          // Drill-down for health shows only the design deliveries considered in the metric
          curr.tasks.push({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.due_date,
            type: t.type,
            isSubtask: !!t.parent_task_id,
            parentTaskId: t.parent_task_id || null,
            assigneeName: getAssigneeName(t),
          });
        }

        clientTaskStats2.set(t.client_id, curr);
      });

      const clientRevenueMap = new Map<string, number>();
      contracts.filter((c: { client_id: string }) => !internalClientIds.has(c.client_id)).forEach((c: { client_id: string; monthly_value: number }) => {
        const curr = clientRevenueMap.get(c.client_id) || 0;
        clientRevenueMap.set(c.client_id, curr + Number(c.monthly_value));
      });

      // Design limits
      const clientDesignLimitMap = new Map<string, number>();
      contractModules.forEach((cm: any) => {
        if (cm.contract?.status === "active" && cm.service_module?.name?.toLowerCase().includes("design")) {
          const clientId = cm.contract?.client_id;
          if (clientId) {
            const curr = clientDesignLimitMap.get(clientId) || 0;
            clientDesignLimitMap.set(clientId, curr + (cm.deliverable_limit || 0));
          }
        }
      });

      const dashboardClients: (DashboardClientHealth & { tasks: ClientTask[] })[] = clients
        .filter((c: { status: string; is_internal?: boolean; id: string }) => 
          c.status === "active" && !c.is_internal && clientDesignLimitMap.has(c.id)
        )
        .map(c => {
          const stats = clientTaskStats2.get(c.id) || { weight: 0, pending: 0, delivered: 0, designDeliverables: 0, arteCount: 0, videoCount: 0, tasks: [] };
          const revenue = clientRevenueMap.get(c.id) || 0;
          let healthStatus: "normal" | "attention" | "critical" = "normal";
          const designLimit = clientDesignLimitMap.get(c.id) || null;
          if (designLimit && designLimit > 0) {
            const percentage = (stats.designDeliverables / designLimit) * 100;
            if (percentage >= 100) healthStatus = "critical";
            else if (percentage >= 81) healthStatus = "attention";
          }
          
          return {
            id: c.id,
            name: c.name,
            logo_url: c.logo_url || null,
            monthlyValue: revenue,
            operationalWeight: stats.weight,
            deliveriesThisMonth: stats.designDeliverables,
            pendingTasks: stats.pending,
            healthStatus,
            designDeliverables: stats.designDeliverables,
            designLimit,
            arteCount: stats.arteCount,
            videoCount: stats.videoCount,
            delivered: stats.delivered,
            tasks: stats.tasks,
          };
        })
        .sort((a, b) => {
          const order = { critical: 0, attention: 1, normal: 2 };
          return order[a.healthStatus] - order[b.healthStatus];
        });

      return {
        stats: {
          overdueTasks,
          todayDeliveries,
          weekDeliveries,
          weekCompleted,
          activeClients,
          monthlyRevenue,
          totalWeight,
          totalCapacity,
          activeTasks: activeTasksCount,
        } as DashboardStats,
        tasks: dashboardTasks,
        team: dashboardTeam,
        clients: dashboardClients,
        isAdmin,
        taskAssigneeMap,
      };
    },
    staleTime: 30000,
  });
}
