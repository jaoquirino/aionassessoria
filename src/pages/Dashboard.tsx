import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  Package,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useDashboard";
import { DeliveriesDashboard, FinancialEvolutionDashboard } from "@/components/dashboard/AdvancedDashboards";
import { OnboardingOverview } from "@/components/dashboard/OnboardingOverview";
import { PeriodSelector, type PeriodOption } from "@/components/dashboard/PeriodSelector";

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary" },
  review: { label: "Revisão", color: "bg-warning/20 text-warning" },
  waiting_client: { label: "Aguardando", color: "bg-info/20 text-info" },
  done: { label: "Entregue", color: "bg-success/20 text-success" },
};

const contractStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-success/20 text-success" },
  expiring_soon: { label: "Próximo do vencimento", color: "bg-warning/20 text-warning" },
  renewing: { label: "Em renovação", color: "bg-primary/20 text-primary" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
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
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState<PeriodOption>("30d");

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

  const { stats, tasks, team, contracts, clients, isAdmin } = data;

  // Overview content component
  const OverviewContent = () => (
    <>
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tarefas Atrasadas"
          value={stats.overdueTasks}
          subtitle="Requer atenção imediata"
          icon={AlertTriangle}
          status={stats.overdueTasks > 0 ? "critical" : "normal"}
          delay={0}
        />
        <MetricCard
          title="Entregas Hoje"
          value={stats.todayDeliveries}
          subtitle="Prazo para hoje"
          icon={CheckCircle}
          status="normal"
          delay={1}
        />
        <MetricCard
          title="Entregas da Semana"
          value={stats.weekDeliveries}
          subtitle={`${stats.weekCompleted} concluídas`}
          icon={Clock}
          status={stats.weekDeliveries - stats.weekCompleted > 5 ? "attention" : "normal"}
          delay={2}
        />
        {isAdmin ? (
          <MetricCard
            title="Contratos em Alerta"
            value={stats.contractsInAlert}
            subtitle="Próximos da renovação"
            icon={Calendar}
            status={stats.contractsInAlert > 0 ? "attention" : "normal"}
            delay={3}
          />
        ) : (
          <MetricCard
            title="Peso Ativo"
            value={stats.totalWeight}
            subtitle={`Capacidade: ${stats.totalCapacity}`}
            icon={Clock}
            status={stats.totalWeight > stats.totalCapacity * 0.8 ? "attention" : "normal"}
            delay={3}
          />
        )}
      </div>

      {/* Admin-only secondary metrics */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Clientes Ativos"
            value={stats.activeClients}
            icon={Users}
            delay={4}
          />
          <MetricCard
            title="Receita Mensal"
            value={formatCurrency(stats.monthlyRevenue)}
            icon={DollarSign}
            delay={5}
          />
          <MetricCard
            title="Peso Total Operacional"
            value={stats.totalWeight}
            subtitle={`Capacidade: ${stats.totalCapacity}`}
            icon={Clock}
            status={stats.totalWeight > stats.totalCapacity ? "critical" : stats.totalWeight > stats.totalCapacity * 0.8 ? "attention" : "normal"}
            delay={6}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6 lg:col-span-2"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Tarefas Ativas</h3>
              <p className="text-sm text-muted-foreground">
                {stats.overdueTasks} atrasadas · {tasks.length} em andamento
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
            {tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma tarefa ativa</p>
            ) : (
              tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    "group flex items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted/50 cursor-pointer",
                    task.isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border"
                  )}
                  onClick={() => navigate("/tarefas")}
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
                      <p className="font-medium text-foreground truncate">{task.title}</p>
                      <Badge variant="outline" className="shrink-0 text-xs">Peso: {task.weight}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{task.clientName}</span>
                      <span>·</span>
                      <span>{task.assigneeName}</span>
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

        {/* Team Capacity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Capacidade da Equipe</h3>
            <p className="text-sm text-muted-foreground">Distribuição de carga</p>
          </div>

          <div className="space-y-5">
            {team.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum membro</p>
            ) : (
              team.slice(0, 4).map((member, index) => {
                const status = getCapacityStatus(member.currentWeight, member.maxWeight);
                const percentage = Math.min((member.currentWeight / member.maxWeight) * 100, 100);

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="space-y-2"
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
      </div>

      {/* Onboarding Overview */}
      {isAdmin && <OnboardingOverview />}

      {/* Contract Alerts & Client Health (admin only) */}
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contracts Alert */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-xl p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Alertas de Contratos</h3>
                  <p className="text-sm text-muted-foreground">
                    {contracts.length} contrato{contracts.length !== 1 ? "s" : ""} requer{contracts.length !== 1 ? "em" : ""} atenção
                  </p>
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

            <div className="space-y-3">
              {contracts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum contrato em alerta</p>
              ) : (
                contracts.map((contract, index) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-muted/50",
                      contract.daysUntilRenewal <= 7
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-warning/30 bg-warning/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{contract.clientName}</span>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>{formatCurrency(contract.monthlyValue)}/mês</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Renova em {contract.daysUntilRenewal} dias</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Badge className={cn(contractStatusConfig[contract.status]?.color)}>
                      {contractStatusConfig[contract.status]?.label}
                    </Badge>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Client Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-xl p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Saúde dos Clientes</h3>
              <p className="text-sm text-muted-foreground">Relação valor × peso operacional</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cliente</th>
                    <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Receita</th>
                    <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Peso</th>
                    <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum cliente ativo</td>
                    </tr>
                  ) : (
                    clients.map((client, index) => (
                      <motion.tr
                        key={client.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 * index }}
                        className="group"
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
        </div>
      )}
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
          {isAdmin ? "Visão geral da operação em tempo real" : "Sua visão operacional"}
        </p>
      </motion.div>

      {/* Admin Dashboard with Tabs */}
      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            
            {activeTab !== "financial" && (
              <PeriodSelector value={period} onChange={setPeriod} />
            )}
          </div>

          <TabsContent value="overview" className="space-y-6">
            <OverviewContent />
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-6">
            <DeliveriesDashboard period={period} />
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <FinancialEvolutionDashboard />
          </TabsContent>
        </Tabs>
      ) : (
        // Member view without tabs
        <div className="space-y-6">
          <OverviewContent />
        </div>
      )}
    </div>
  );
}
