import { useState, useMemo, useRef } from "react";

import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  Package,
  TrendingUp,
  CornerDownRight,
  Activity,
  Heart,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDashboardData, type ClientTask } from "@/hooks/useDashboard";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { useFinancialEvolution } from "@/hooks/useDeliveriesDashboard";
import { DeliveriesDashboard, FinancialEvolutionDashboard } from "@/components/dashboard/AdvancedDashboards";
import { OnboardingOverview } from "@/components/dashboard/OnboardingOverview";
import { OnboardingTasksSection } from "@/components/dashboard/OnboardingTasksSection";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import { TeamMemberTasksDialog } from "@/components/team/TeamMemberTasksDialog";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary" },
  review: { label: "Revisão", color: "bg-warning/20 text-warning" },
  waiting_client: { label: "Aguardando", color: "bg-info/20 text-info" },
  done: { label: "Entregue", color: "bg-success/20 text-success" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getCapacityStatus(current: number, max: number) {
  const percentage = (current / max) * 100;
  if (percentage > 100) return "critical";
  if (percentage >= 80) return "attention";
  return "normal";
}

type TaskFilter = "all" | "overdue" | "today" | "week" | "active";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardData();
  const { data: currentMember } = useCurrentTeamMember();
  const { data: financialData } = useFinancialEvolution();
  const [activeTab, setActiveTab] = useState("overview");
  
  const [selectedClientHealth, setSelectedClientHealth] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<any>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const hasAnimated = useRef(false);
  const isRestricted = currentMember?.restricted_view === true;

  // Mini chart data for revenue - show all 12 months
  const revenueChartData = useMemo(() => {
    if (!financialData?.data) return [];
    return financialData.data.map(d => ({
      name: d.monthName,
      value: d.currentYearRevenue,
    }));
  }, [financialData]);

  // Derived data (safe even when data is null)
  const derivedData = useMemo(() => {
    if (!data) return null;
    const { stats, tasks, team, clients, isAdmin, taskAssigneeMap } = data;

    const isTaskAssignedToMe = (task: typeof tasks[0]) => {
      if (!currentMember) return false;
      if (task.assigneeName.includes(currentMember.name)) return true;
      const assigneeIds = taskAssigneeMap?.get(task.id);
      return assigneeIds ? assigneeIds.includes(currentMember.id) : false;
    };

    const baseTasks = isRestricted && currentMember
      ? tasks.filter(isTaskAssignedToMe)
      : tasks;

    const filteredTeam = isRestricted && currentMember
      ? team.filter(m => m.id === currentMember.id)
      : team;

    const displayStats = isRestricted && currentMember
      ? {
          ...stats,
          overdueTasks: baseTasks.filter(t => t.isOverdue).length,
          todayDeliveries: baseTasks.filter(t => {
            const due = new Date(t.dueDate);
            return due.toDateString() === new Date().toDateString();
          }).length,
          weekDeliveries: baseTasks.length,
          weekCompleted: baseTasks.filter(t => t.status === "done").length,
          totalWeight: filteredTeam[0]?.currentWeight || 0,
          totalCapacity: filteredTeam[0]?.maxWeight || 0,
          activeTasks: baseTasks.length,
        }
      : stats;

    return { stats, tasks, team, clients, isAdmin, taskAssigneeMap, baseTasks, filteredTeam, displayStats };
  }, [data, currentMember, isRestricted]);

  const filteredTasks = useMemo(() => {
    if (!derivedData) return [];
    const { baseTasks } = derivedData;
    const now = new Date();
    const today = now.toDateString();

    switch (taskFilter) {
      case "overdue":
        return baseTasks.filter(t => t.isOverdue);
      case "today":
        return baseTasks.filter(t => new Date(t.dueDate).toDateString() === today);
      case "week":
        return baseTasks;
      case "active":
        return baseTasks.filter(t => t.status !== "done");
      default:
        return baseTasks;
    }
  }, [derivedData, taskFilter]);

  if (isLoading || !data || !derivedData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const { stats, tasks, team, clients, isAdmin, baseTasks, filteredTeam, displayStats } = derivedData;

  const handleTaskClick = (task: { id: string; isSubtask: boolean; parentTaskId: string | null }) => {
    if (task.isSubtask && task.parentTaskId) {
      setSelectedTaskId(task.parentTaskId);
    } else {
      setSelectedTaskId(task.id);
    }
  };

  const handleClientTaskClick = (task: ClientTask) => {
    if (task.isSubtask && task.parentTaskId) {
      setSelectedTaskId(task.parentTaskId);
    } else {
      setSelectedTaskId(task.id);
    }
  };

  // Only animate on first mount
  const shouldAnimate = !hasAnimated.current;

  const overviewContent = (
    <>
      {/* ROW 1: Unified Task Metrics Card */}
      <div className={cn("glass rounded-xl p-6", shouldAnimate && "animate-fade-in")}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{isRestricted ? "Minhas Tarefas" : "Tarefas"}</h3>
              <p className="text-sm text-muted-foreground">
                {displayStats.overdueTasks} atrasadas · {baseTasks.length} em andamento
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/tarefas")}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setTaskFilter(taskFilter === "overdue" ? "all" : "overdue")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all hover:scale-105",
              taskFilter === "overdue"
                ? "bg-destructive text-destructive-foreground border border-destructive shadow-sm"
                : displayStats.overdueTasks > 0
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-muted/50 text-muted-foreground border border-border"
            )}
          >
            {displayStats.overdueTasks} Atrasadas
          </button>
          <button
            onClick={() => setTaskFilter(taskFilter === "today" ? "all" : "today")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all hover:scale-105",
              taskFilter === "today"
                ? "bg-success text-success-foreground border border-success shadow-sm"
                : "bg-success/10 text-success border border-success/20"
            )}
          >
            {displayStats.todayDeliveries} Entregas Hoje
          </button>
          <button
            onClick={() => setTaskFilter(taskFilter === "week" ? "all" : "week")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all hover:scale-105",
              taskFilter === "week"
                ? "bg-primary text-primary-foreground border border-primary shadow-sm"
                : "bg-primary/10 text-primary border border-primary/20"
            )}
          >
            {displayStats.weekDeliveries} Da Semana
          </button>
          <button
            onClick={() => setTaskFilter(taskFilter === "active" ? "all" : "active")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all hover:scale-105",
              taskFilter === "active"
                ? "bg-foreground text-background border border-foreground shadow-sm"
                : "bg-muted/50 text-foreground border border-border"
            )}
          >
            {displayStats.activeTasks} Ativas
          </button>
        </div>

        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              {taskFilter !== "all" ? "Nenhuma tarefa neste filtro" : "Nenhuma tarefa ativa"}
            </p>
          ) : (
            filteredTasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-4 rounded-lg border p-3 transition-all hover:bg-muted/50 cursor-pointer",
                  task.isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border"
                )}
                onClick={() => handleTaskClick(task)}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    task.isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  )}
                >
                  {task.isOverdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {task.isSubtask && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.clientName}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      {task.assigneeAvatar && (
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={task.assigneeAvatar} />
                          <AvatarFallback className="text-[8px]">
                            {task.assigneeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span>{task.assigneeName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("shrink-0 text-[10px]", statusConfig[task.status]?.color || "bg-muted")}>
                    {statusConfig[task.status]?.label || task.status}
                  </Badge>
                  {task.isOverdue && <span className="text-xs font-medium text-destructive">Atrasada</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ROW 2: Capacity + Revenue */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className={cn("glass rounded-xl p-6 lg:col-span-3", shouldAnimate && "animate-fade-in")} style={shouldAnimate ? { animationDelay: "0.1s", animationFillMode: "both" } : undefined}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Capacidade da Equipe</h3>
                <p className="text-sm text-muted-foreground">Peso × Capacidade</p>
              </div>
            </div>
            {!isRestricted && (
              <button onClick={() => navigate("/equipe")} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver equipe <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Peso Total</span>
              <span className={cn("text-lg font-bold",
                displayStats.totalWeight > displayStats.totalCapacity ? "text-destructive" :
                displayStats.totalWeight > displayStats.totalCapacity * 0.8 ? "text-warning" : "text-success"
              )}>{displayStats.totalWeight} / {displayStats.totalCapacity}</span>
            </div>
            <Progress
              value={Math.min((displayStats.totalWeight / (displayStats.totalCapacity || 1)) * 100, 100)}
              className={cn("h-3",
                displayStats.totalWeight > displayStats.totalCapacity && "[&>div]:bg-destructive",
                displayStats.totalWeight > displayStats.totalCapacity * 0.8 && displayStats.totalWeight <= displayStats.totalCapacity && "[&>div]:bg-warning",
                displayStats.totalWeight <= displayStats.totalCapacity * 0.8 && "[&>div]:bg-success"
              )}
            />
          </div>
          <div className="space-y-4">
            {(isRestricted ? filteredTeam : team).length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum membro</p>
            ) : (
              (isRestricted ? filteredTeam : team).map((member) => {
                const status = getCapacityStatus(member.currentWeight, member.maxWeight);
                const percentage = Math.min((member.currentWeight / member.maxWeight) * 100, 100);
                return (
                  <div key={member.id} className="space-y-2 cursor-pointer rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedTeamMember({ id: member.id, name: member.name, role: member.role, avatar_url: member.avatar_url })}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("status-indicator", `status-${status}`)} />
                        <span className="text-sm font-medium text-foreground">{member.currentWeight}/{member.maxWeight}</span>
                      </div>
                    </div>
                    <Progress value={percentage} className={cn("h-2",
                      status === "critical" && "[&>div]:bg-destructive",
                      status === "attention" && "[&>div]:bg-warning",
                      status === "normal" && "[&>div]:bg-success"
                    )} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{member.tasksCount} tarefas ativas</span>
                      {member.overdueTasks > 0 && (
                        <span className="text-destructive">{member.overdueTasks} atrasada{member.overdueTasks > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {isAdmin && (
          <div className={cn("lg:col-span-2 flex flex-col gap-6", shouldAnimate && "animate-fade-in")} style={shouldAnimate ? { animationDelay: "0.2s", animationFillMode: "both" } : undefined}>
            <div className="glass rounded-xl p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita Mensal</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
              </div>
              {revenueChartData.length > 1 && (
                <div className="flex-1 min-h-0">
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Receita"]}
                          contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#revenueGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="h-px bg-border my-3" />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeClients}</p>
                </div>
              </div>
              <button onClick={() => navigate("/clientes")} className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:underline self-end">
                Ver clientes <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isAdmin && <OnboardingOverview />}
      {isAdmin && <OnboardingTasksSection />}

      {isAdmin && (
        <div className={cn("glass rounded-xl p-6", shouldAnimate && "animate-fade-in")} style={shouldAnimate ? { animationDelay: "0.3s", animationFillMode: "both" } : undefined}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Heart className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Saúde dos Clientes</h3>
                <p className="text-sm text-muted-foreground">Mês atual — Relação valor × peso operacional</p>
              </div>
            </div>
            <button onClick={() => navigate("/clientes")} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ver todos <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Receita</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Peso</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Entregas</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum cliente ativo</td></tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="group cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedClientHealth(client)}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-2 w-2 rounded-full shrink-0",
                            client.healthStatus === "normal" && "bg-success",
                            client.healthStatus === "attention" && "bg-warning",
                            client.healthStatus === "critical" && "bg-destructive"
                          )} />
                          <span className="font-medium text-foreground">{client.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-foreground">{formatCurrency(client.monthlyValue)}</td>
                      <td className="py-4">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          client.operationalWeight > 15 ? "bg-destructive/10 text-destructive" :
                          client.operationalWeight > 10 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                        )}>{client.operationalWeight}</span>
                      </td>
                      <td className="py-4"><span className="text-sm text-muted-foreground">{client.deliveriesThisMonth}</span></td>
                      <td className="py-4">
                        <span className={cn("text-xs font-medium capitalize",
                          client.healthStatus === "normal" && "text-success",
                          client.healthStatus === "attention" && "text-warning",
                          client.healthStatus === "critical" && "text-destructive"
                        )}>
                          {client.healthStatus === "normal" ? "Saudável" : client.healthStatus === "attention" ? "Atenção" : "Crítico"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  // Mark as animated after first render
  if (!hasAnimated.current) {
    hasAnimated.current = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {isRestricted ? "Suas tarefas e capacidade" : isAdmin ? "Visão geral da operação em tempo real" : "Sua visão operacional"}
        </p>
      </div>

      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="overview" className="gap-2"><Clock className="h-4 w-4" />Visão Geral</TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2"><Package className="h-4 w-4" />Entregas</TabsTrigger>
            <TabsTrigger value="financial" className="gap-2"><TrendingUp className="h-4 w-4" />Evolução Financeira</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-6">{overviewContent}</TabsContent>
          <TabsContent value="deliveries" className="space-y-6"><DeliveriesDashboard /></TabsContent>
          <TabsContent value="financial" className="space-y-6"><FinancialEvolutionDashboard /></TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">{overviewContent}</div>
      )}

      <TaskEditDialog taskId={selectedTaskId} open={!!selectedTaskId} onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }} />
      <TeamMemberTasksDialog member={selectedTeamMember} open={!!selectedTeamMember} onOpenChange={(open) => { if (!open) setSelectedTeamMember(null); }} />

      <Dialog open={!!selectedClientHealth} onOpenChange={(open) => { if (!open) setSelectedClientHealth(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-3">
              {selectedClientHealth && (
                <>
                  <div className={cn("h-3 w-3 rounded-full shrink-0",
                    selectedClientHealth.healthStatus === "normal" && "bg-success",
                    selectedClientHealth.healthStatus === "attention" && "bg-warning",
                    selectedClientHealth.healthStatus === "critical" && "bg-destructive"
                  )} />
                  {selectedClientHealth.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Detalhes de saúde do cliente</DialogDescription>
          </DialogHeader>
          {selectedClientHealth && (() => {
            const clientTasks = (selectedClientHealth as any).tasks as ClientTask[] || [];
            return (
              <div className="space-y-4 overflow-y-auto min-h-0 flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(selectedClientHealth.monthlyValue)}</p>
                    <p className="text-xs text-muted-foreground">Receita</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{selectedClientHealth.operationalWeight}</p>
                    <p className="text-xs text-muted-foreground">Peso</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{selectedClientHealth.deliveriesThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Entregas</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Tarefas do mês</h4>
                  {clientTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa no período</p>
                  ) : (
                    <div className="space-y-1.5">
                      {clientTasks.map(task => (
                        <div key={task.id} onClick={() => { setSelectedClientHealth(null); handleClientTaskClick(task); }}
                          className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 border border-transparent hover:border-border"
                        >
                          {task.isSubtask && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{task.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{task.assigneeName}</span>
                          <Badge className={cn("shrink-0 text-[10px] whitespace-nowrap", statusConfig[task.status]?.color || "bg-muted")}>
                            {statusConfig[task.status]?.label || task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}