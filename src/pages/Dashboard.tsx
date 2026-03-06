import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  Package,
  TrendingUp,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDashboardData, type ClientTask } from "@/hooks/useDashboard";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { DeliveriesDashboard, FinancialEvolutionDashboard } from "@/components/dashboard/AdvancedDashboards";
import { OnboardingOverview } from "@/components/dashboard/OnboardingOverview";
import { OnboardingTasksSection } from "@/components/dashboard/OnboardingTasksSection";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import { TeamMemberTasksDialog } from "@/components/team/TeamMemberTasksDialog";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardData();
  const { data: currentMember } = useCurrentTeamMember();
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [selectedClientHealth, setSelectedClientHealth] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<any>(null);

  const isRestricted = currentMember?.restricted_view === true;

  if (isLoading || !data) {
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

  const { stats, tasks, team, clients, isAdmin, taskAssigneeMap } = data;

  const isTaskAssignedToMe = (task: typeof tasks[0]) => {
    if (!currentMember) return false;
    if (task.assigneeName.includes(currentMember.name)) return true;
    const assigneeIds = taskAssigneeMap?.get(task.id);
    return assigneeIds ? assigneeIds.includes(currentMember.id) : false;
  };

  const filteredTasks = isRestricted && currentMember
    ? tasks.filter(isTaskAssignedToMe)
    : tasks;

  const filteredTeam = isRestricted && currentMember
    ? team.filter(m => m.id === currentMember.id)
    : team;

  const displayStats = isRestricted && currentMember
    ? {
        ...stats,
        overdueTasks: filteredTasks.filter(t => t.isOverdue).length,
        todayDeliveries: filteredTasks.filter(t => {
          const due = new Date(t.dueDate);
          return due.toDateString() === new Date().toDateString();
        }).length,
        weekDeliveries: filteredTasks.length,
        weekCompleted: filteredTasks.filter(t => t.status === "done").length,
        totalWeight: filteredTeam[0]?.currentWeight || 0,
        totalCapacity: filteredTeam[0]?.maxWeight || 0,
        activeTasks: filteredTasks.length,
      }
    : stats;

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

  const OverviewContent = () => (
    <>
      {/* ROW 1: Unified Task Metrics Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Tarefas</h3>
            <p className="text-sm text-muted-foreground">Resumo operacional</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate("/tarefas?filter=overdue")}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all hover:scale-105",
              displayStats.overdueTasks > 0
                ? "bg-destructive/10 border border-destructive/20"
                : "bg-muted/50 border border-border"
            )}
          >
            <AlertTriangle className={cn("h-5 w-5 mb-1", displayStats.overdueTasks > 0 ? "text-destructive" : "text-muted-foreground")} />
            <span className={cn("text-2xl font-bold", displayStats.overdueTasks > 0 ? "text-destructive" : "text-foreground")}>
              {displayStats.overdueTasks}
            </span>
            <span className="text-xs text-muted-foreground">Atrasadas</span>
          </div>
          <div
            onClick={() => navigate("/tarefas?filter=today")}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 border border-border cursor-pointer transition-all hover:scale-105"
          >
            <CheckCircle className="h-5 w-5 mb-1 text-success" />
            <span className="text-2xl font-bold text-foreground">{displayStats.todayDeliveries}</span>
            <span className="text-xs text-muted-foreground">Entregas Hoje</span>
          </div>
          <div
            onClick={() => navigate("/tarefas?filter=week")}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 border border-border cursor-pointer transition-all hover:scale-105"
          >
            <Clock className="h-5 w-5 mb-1 text-primary" />
            <span className="text-2xl font-bold text-foreground">{displayStats.weekDeliveries}</span>
            <span className="text-xs text-muted-foreground">Da Semana</span>
            <span className="text-[10px] text-muted-foreground">{displayStats.weekCompleted} concluídas</span>
          </div>
          <div
            onClick={() => navigate("/tarefas")}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 border border-border cursor-pointer transition-all hover:scale-105"
          >
            <Package className="h-5 w-5 mb-1 text-primary" />
            <span className="text-2xl font-bold text-foreground">{displayStats.activeTasks}</span>
            <span className="text-xs text-muted-foreground">Ativas</span>
          </div>
        </div>
      </motion.div>

      {/* ROW 2: Capacity + Weight (left) | Revenue + Clients (right) */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Team Capacity + Weight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6 lg:col-span-3"
        >
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
              <button
                onClick={() => navigate("/equipe")}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ver equipe
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Weight summary bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Peso Total</span>
              <span className={cn(
                "text-lg font-bold",
                displayStats.totalWeight > displayStats.totalCapacity ? "text-destructive" :
                displayStats.totalWeight > displayStats.totalCapacity * 0.8 ? "text-warning" : "text-success"
              )}>
                {displayStats.totalWeight} / {displayStats.totalCapacity}
              </span>
            </div>
            <Progress
              value={Math.min((displayStats.totalWeight / (displayStats.totalCapacity || 1)) * 100, 100)}
              className={cn(
                "h-3",
                displayStats.totalWeight > displayStats.totalCapacity && "[&>div]:bg-destructive",
                displayStats.totalWeight > displayStats.totalCapacity * 0.8 && displayStats.totalWeight <= displayStats.totalCapacity && "[&>div]:bg-warning",
                displayStats.totalWeight <= displayStats.totalCapacity * 0.8 && "[&>div]:bg-success"
              )}
            />
          </div>

          {/* Team members list */}
          <div className="space-y-4">
            {(isRestricted ? filteredTeam : team).length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum membro</p>
            ) : (
              (isRestricted ? filteredTeam : team).map((member, index) => {
                const status = getCapacityStatus(member.currentWeight, member.maxWeight);
                const percentage = Math.min((member.currentWeight / member.maxWeight) * 100, 100);
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="space-y-2 cursor-pointer rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedTeamMember({
                      id: member.id,
                      name: member.name,
                      role: member.role,
                      avatar_url: member.avatar_url,
                    })}
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
                        <span className="text-sm font-medium text-foreground">
                          {member.currentWeight}/{member.maxWeight}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn(
                        "h-2",
                        status === "critical" && "[&>div]:bg-destructive",
                        status === "attention" && "[&>div]:bg-warning",
                        status === "normal" && "[&>div]:bg-success"
                      )}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{member.tasksCount} tarefas ativas</span>
                      {member.overdueTasks > 0 && (
                        <span className="text-destructive">
                          {member.overdueTasks} atrasada{member.overdueTasks > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Revenue + Active Clients */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 flex flex-col gap-6"
          >
            {/* Revenue Card */}
            <div className="glass rounded-xl p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita Mensal</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center gap-3 mt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeClients}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/clientes")}
                className="mt-6 flex items-center gap-1 text-sm font-medium text-primary hover:underline self-end"
              >
                Ver clientes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Onboarding */}
      {isAdmin && <OnboardingOverview />}
      {isAdmin && <OnboardingTasksSection />}

      {/* ROW 3: Client Health (admin only) */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-6"
        >
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
            <button
              onClick={() => navigate("/clientes")}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
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
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum cliente ativo</td>
                  </tr>
                ) : (
                  clients.map((client, index) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 * index }}
                      className="group cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setSelectedClientHealth(client)}
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              client.healthStatus === "normal" && "bg-success",
                              client.healthStatus === "attention" && "bg-warning",
                              client.healthStatus === "critical" && "bg-destructive"
                            )}
                          />
                          <span className="font-medium text-foreground">{client.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-foreground">{formatCurrency(client.monthlyValue)}</td>
                      <td className="py-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                            client.operationalWeight > 15
                              ? "bg-destructive/10 text-destructive"
                              : client.operationalWeight > 10
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                          )}
                        >
                          {client.operationalWeight}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-muted-foreground">
                          {client.deliveriesThisMonth}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            client.healthStatus === "normal" && "text-success",
                            client.healthStatus === "attention" && "text-warning",
                            client.healthStatus === "critical" && "text-destructive"
                          )}
                        >
                          {client.healthStatus === "normal" ? "Saudável" : client.healthStatus === "attention" ? "Atenção" : "Crítico"}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Active Tasks List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass rounded-xl p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{isRestricted ? "Minhas Tarefas" : "Tarefas Ativas"}</h3>
            <p className="text-sm text-muted-foreground">
              {displayStats.overdueTasks} atrasadas · {filteredTasks.length} em andamento
            </p>
          </div>
          <button
            onClick={() => navigate("/tarefas")}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma tarefa ativa</p>
          ) : (
            filteredTasks.slice(0, 8).map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className={cn(
                  "group flex items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted/50 cursor-pointer",
                  task.isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border"
                )}
                onClick={() => handleTaskClick(task)}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    task.isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  )}
                >
                  {task.isOverdue ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {task.isSubtask && (
                      <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <p className="font-medium text-foreground truncate">{task.title}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
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

                <div className="flex items-center gap-3">
                  <Badge className={cn("shrink-0", statusConfig[task.status]?.color || "bg-muted")}>
                    {statusConfig[task.status]?.label || task.status}
                  </Badge>
                  {task.isOverdue && (
                    <span className="text-xs font-medium text-destructive">Atrasada</span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {isRestricted ? "Suas tarefas e capacidade" : isAdmin ? "Visão geral da operação em tempo real" : "Sua visão operacional"}
        </p>
      </motion.div>

      {/* Admin Dashboard with Tabs */}
      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="overview" className="gap-2">
              <Clock className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2">
              <Package className="h-4 w-4" />
              Entregas
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Evolução Financeira
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewContent />
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-6">
            <DeliveriesDashboard />
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <FinancialEvolutionDashboard />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <OverviewContent />
        </div>
      )}

      {/* Task Edit Dialog */}
      <TaskEditDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
      />

      {/* Team Member Tasks Dialog */}
      <TeamMemberTasksDialog
        member={selectedTeamMember}
        open={!!selectedTeamMember}
        onOpenChange={(open) => { if (!open) setSelectedTeamMember(null); }}
      />
    </div>
  );
}
