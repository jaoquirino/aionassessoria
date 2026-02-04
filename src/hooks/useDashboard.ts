import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useUserRoles";

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
}

export function useDashboardData() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["dashboard", isAdmin],
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Fetch tasks
      const { data: tasks = [] } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date");

      // Fetch clients
      const { data: clients = [] } = await supabase
        .from("clients")
        .select("*");

      // Fetch contracts
      const { data: contracts = [] } = await supabase
        .from("contracts")
        .select("*, client:clients(name)")
        .eq("status", "active");

      // Fetch team members
      const { data: teamMembers = [] } = await supabase
        .from("team_members_public")
        .select("*")
        .eq("is_active", true);

      const now = new Date();

      // Calculate stats
      const overdueTasks = tasks.filter(t => new Date(t.due_date) < now && t.status !== "done").length;
      const todayDeliveries = tasks.filter(t => {
        const due = new Date(t.due_date);
        return due.toDateString() === today.toDateString();
      }).length;
      const weekTasks = tasks.filter(t => {
        const due = new Date(t.due_date);
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
      const monthlyRevenue = contracts.reduce((sum, c) => sum + Number(c.monthly_value), 0);

      const activeTasks = tasks.filter(t => t.status !== "done");
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
        dueDate: t.due_date,
        status: t.status,
        isOverdue: new Date(t.due_date) < now && t.status !== "done",
        weight: t.weight,
        type: t.type,
      }));

      // Map team capacity
      const memberTaskStats = new Map<string, { weight: number; count: number; overdue: number }>();
      activeTasks.forEach(t => {
        if (t.assigned_to) {
          const curr = memberTaskStats.get(t.assigned_to) || { weight: 0, count: 0, overdue: 0 };
          curr.weight += t.weight;
          curr.count += 1;
          if (new Date(t.due_date) < now) curr.overdue += 1;
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

      // Client health
      const clientTaskStats = new Map<string, { weight: number; pending: number; delivered: number }>();
      tasks.forEach(t => {
        const curr = clientTaskStats.get(t.client_id) || { weight: 0, pending: 0, delivered: 0 };
        if (t.status !== "done") {
          curr.weight += t.weight;
          curr.pending += 1;
        } else {
          const doneDate = new Date(t.updated_at);
          if (doneDate >= startOfMonth) curr.delivered += 1;
        }
        clientTaskStats.set(t.client_id, curr);
      });

      const clientRevenueMap = new Map<string, number>();
      contracts.forEach(c => {
        const curr = clientRevenueMap.get(c.client_id) || 0;
        clientRevenueMap.set(c.client_id, curr + Number(c.monthly_value));
      });

      const dashboardClients: DashboardClientHealth[] = clients
        .filter(c => c.status === "active")
        .map(c => {
          const stats = clientTaskStats.get(c.id) || { weight: 0, pending: 0, delivered: 0 };
          const revenue = clientRevenueMap.get(c.id) || 0;
          const ratio = revenue > 0 && stats.weight > 0 ? revenue / stats.weight : 1;
          let healthStatus: "normal" | "attention" | "critical" = "normal";
          if (ratio < 200) healthStatus = "critical";
          else if (ratio < 400) healthStatus = "attention";
          return {
            id: c.id,
            name: c.name,
            monthlyValue: revenue,
            operationalWeight: stats.weight,
            deliveriesThisMonth: stats.delivered,
            pendingTasks: stats.pending,
            healthStatus,
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
        isAdmin: !!isAdmin,
      };
    },
    staleTime: 30000,
  });
}
