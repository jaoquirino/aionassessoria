import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/utils";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";

export interface DashboardStats {
  overdueTasks: number;
  todayDeliveries: number;
  weekDeliveries: number;
  weekCompleted: number;
  contractsInAlert: number;
  activeClients: number;
  monthlyRevenue: number;
  totalWeight: number;
  totalCapacity: number;
}

export interface DashboardTask {
  id: string;
  title: string;
  clientName: string;
  assigneeName: string;
  assigneeAvatar: string | null;
  dueDate: string;
  status: string;
  isOverdue: boolean;
  weight: number;
  type: string;
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

export interface DashboardContract {
  id: string;
  clientName: string;
  monthlyValue: number;
  renewalDate: string;
  daysUntilRenewal: number;
  status: string;
}

export interface DashboardClientHealth {
  id: string;
  name: string;
  monthlyValue: number;
  operationalWeight: number;
  deliveriesThisMonth: number;
  pendingTasks: number;
  healthStatus: "normal" | "attention" | "critical";
  designDeliverables: number;
  designLimit: number | null;
}

export function useDashboardData() {
  const { data: currentMember } = useCurrentTeamMember();
  const isAdmin = currentMember?.permission === "admin";

  return useQuery({
    queryKey: ["dashboard", isAdmin],
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Parallel fetch for all data - much faster
      const [tasksRes, clientsRes, contractsRes, teamMembersRes, contractModulesRes] = await Promise.all([
        supabase.from("tasks").select("*").order("due_date"),
        supabase.from("clients").select("*, is_internal"),
        supabase.from("contracts").select("*, client:clients(name)").eq("status", "active"),
        supabase.from("team_members_public").select("*").eq("is_active", true),
        supabase.from("contract_modules").select("*, service_module:service_modules(name, primary_role), contract:contracts(client_id, status)"),
      ]);

      const tasks = tasksRes.data || [];
      const clients = clientsRes.data || [];
      const contracts = contractsRes.data || [];
      const teamMembers = teamMembersRes.data || [];
      const contractModules = contractModulesRes.data || [];

      // Create internal client IDs set for filtering
      const internalClientIds = new Set(
        clients.filter((c: { is_internal?: boolean }) => c.is_internal).map((c: { id: string }) => c.id)
      );

      const now = new Date();

      // Filter out onboarding (project) tasks from general stats
      // Also filter out tasks from internal clients for weight calculations
      const operationalTasks = tasks.filter(t => t.type !== "project" && t.type !== "onboarding");
      const operationalTasksForWeight = operationalTasks.filter(t => !internalClientIds.has(t.client_id));

      // Calculate stats (excluding onboarding tasks)
      const overdueTasks = operationalTasks.filter(t => parseLocalDate(t.due_date) < now && t.status !== "done").length;
      const todayDeliveries = operationalTasks.filter(t => {
        const due = parseLocalDate(t.due_date);
        return due.toDateString() === today.toDateString();
      }).length;
      const weekTasks = operationalTasks.filter(t => {
        const due = parseLocalDate(t.due_date);
        return due >= startOfWeek && due <= endOfWeek;
      });
      const weekDeliveries = weekTasks.length;
      const weekCompleted = weekTasks.filter(t => t.status === "done").length;

      const contractsInAlert = contracts.filter(c => {
        if (!c.renewal_date) return false;
        const days = Math.ceil((new Date(c.renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 30;
      }).length;

      const activeClients = clients.filter(c => c.status === "active").length;
      // Exclude internal clients from revenue calculation
      const monthlyRevenue = contracts
        .filter((c: { client_id: string }) => !internalClientIds.has(c.client_id))
        .reduce((sum: number, c: { monthly_value: number }) => sum + Number(c.monthly_value), 0);

      const activeTasks = operationalTasksForWeight.filter(t => t.status !== "done");
      const totalWeight = activeTasks.reduce((sum, t) => sum + t.weight, 0);
      const totalCapacity = teamMembers.reduce((sum, m) => sum + (m.capacity_limit || 0), 0);

      // Map tasks for display
      const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));
      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      const dashboardTasks: DashboardTask[] = activeTasks.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        clientName: clientMap.get(t.client_id) || "—",
        assigneeName: t.assigned_to ? memberMap.get(t.assigned_to) || "Não atribuído" : "Não atribuído",
        assigneeAvatar: t.assigned_to ? (teamMembers.find(m => m.id === t.assigned_to)?.avatar_url || null) : null,
        dueDate: t.due_date,
        status: t.status,
        isOverdue: parseLocalDate(t.due_date) < now && t.status !== "done",
        weight: t.weight,
        type: t.type,
      }));

      // Map team capacity (using operational tasks only)
      // Also exclude internal client tasks from weight calculation
      const memberTaskStats = new Map<string, { weight: number; count: number; overdue: number }>();
      operationalTasksForWeight.filter(t => t.status !== "done").forEach(t => {
        if (t.assigned_to) {
          const curr = memberTaskStats.get(t.assigned_to) || { weight: 0, count: 0, overdue: 0 };
          curr.weight += t.weight;
          curr.count += 1;
          if (parseLocalDate(t.due_date) < now) curr.overdue += 1;
          memberTaskStats.set(t.assigned_to, curr);
        }
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

      // Contracts needing attention
      const dashboardContracts: DashboardContract[] = contracts
        .filter(c => {
          if (!c.renewal_date) return false;
          const days = Math.ceil((new Date(c.renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return days > 0 && days <= 30;
        })
        .map(c => {
          const days = Math.ceil((new Date(c.renewal_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: c.id,
            clientName: c.client?.name || "—",
            monthlyValue: Number(c.monthly_value),
            renewalDate: c.renewal_date!,
            daysUntilRenewal: days,
            status: days <= 7 ? "renewing" : "expiring_soon",
          };
        })
        .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
        .slice(0, 4);

      // Client health (using operational tasks only)
      const clientTaskStats = new Map<string, { weight: number; pending: number; delivered: number; designDeliverables: number }>();
      operationalTasksForWeight.forEach(t => {
        const curr = clientTaskStats.get(t.client_id) || { weight: 0, pending: 0, delivered: 0, designDeliverables: 0 };
        if (t.status !== "done") {
          curr.weight += t.weight;
          curr.pending += 1;
        } else {
          const doneDate = new Date(t.updated_at);
          if (doneDate >= startOfMonth) {
            curr.delivered += 1;
            if ((t as any).deliverable_type === "arte" || (t as any).deliverable_type === "video") {
              curr.designDeliverables += 1;
            }
          }
        }
        // Also count non-done design deliverables this month
        if (t.status !== "done" && ((t as any).deliverable_type === "arte" || (t as any).deliverable_type === "video")) {
          const taskDate = parseLocalDate(t.due_date);
          if (taskDate >= startOfMonth) {
            curr.designDeliverables += 1;
          }
        }
        clientTaskStats.set(t.client_id, curr);
      });

      const clientRevenueMap = new Map<string, number>();
      // Exclude internal clients from revenue map
      contracts.filter((c: { client_id: string }) => !internalClientIds.has(c.client_id)).forEach((c: { client_id: string; monthly_value: number }) => {
        const curr = clientRevenueMap.get(c.client_id) || 0;
        clientRevenueMap.set(c.client_id, curr + Number(c.monthly_value));
      });

      const dashboardClients: DashboardClientHealth[] = clients
        .filter((c: { status: string; is_internal?: boolean }) => c.status === "active" && !c.is_internal)
        .map(c => {
          const stats = clientTaskStats.get(c.id) || { weight: 0, pending: 0, delivered: 0, designDeliverables: 0 };
          const revenue = clientRevenueMap.get(c.id) || 0;
          let healthStatus: "normal" | "attention" | "critical" = "normal";
          if (stats.weight === 0) {
            healthStatus = "normal";
          } else {
            const ratio = revenue > 0 ? revenue / stats.weight : 0;
            if (ratio < 200) healthStatus = "critical";
            else if (ratio < 400) healthStatus = "attention";
          }
          
          // Find design deliverable limit for this client
          const clientDesignModules = contractModules.filter((cm: any) => 
            cm.contract?.client_id === c.id && 
            cm.contract?.status === "active" &&
            cm.service_module?.name?.toLowerCase().includes("design")
          );
          const designLimit = clientDesignModules.reduce((sum: number, cm: any) => sum + (cm.deliverable_limit || 0), 0) || null;
          
          return {
            id: c.id,
            name: c.name,
            monthlyValue: revenue,
            operationalWeight: stats.weight,
            deliveriesThisMonth: stats.delivered,
            pendingTasks: stats.pending,
            healthStatus,
            designDeliverables: stats.designDeliverables,
            designLimit,
          };
        })
        .sort((a, b) => {
          const order = { critical: 0, attention: 1, normal: 2 };
          return order[a.healthStatus] - order[b.healthStatus];
        })
        .slice(0, 5);

      return {
        stats: {
          overdueTasks,
          todayDeliveries,
          weekDeliveries,
          weekCompleted,
          contractsInAlert,
          activeClients,
          monthlyRevenue,
          totalWeight,
          totalCapacity,
        } as DashboardStats,
        tasks: dashboardTasks,
        team: dashboardTeam,
        contracts: dashboardContracts,
        clients: dashboardClients,
        isAdmin,
      };
    },
    staleTime: 30000,
  });
}
