import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  DollarSign,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import { TeamCapacity } from "@/components/dashboard/TeamCapacity";
import { ContractsAlert } from "@/components/dashboard/ContractsAlert";
import { ClientsHealth } from "@/components/dashboard/ClientsHealth";

export default function Dashboard() {
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
          Visão geral da operação em tempo real
        </p>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tarefas Atrasadas"
          value={7}
          subtitle="Requer atenção imediata"
          icon={AlertTriangle}
          status="critical"
          delay={0}
        />
        <MetricCard
          title="Entregas Hoje"
          value={4}
          subtitle="2 já concluídas"
          icon={CheckCircle}
          status="normal"
          delay={1}
        />
        <MetricCard
          title="Entregas da Semana"
          value={18}
          subtitle="12 concluídas, 6 pendentes"
          icon={Clock}
          status="attention"
          delay={2}
        />
        <MetricCard
          title="Contratos em Alerta"
          value={3}
          subtitle="Próximos da renovação"
          icon={Calendar}
          status="attention"
          delay={3}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Clientes Ativos"
          value={24}
          trend={{ value: 8, isPositive: true }}
          icon={Users}
          delay={4}
        />
        <MetricCard
          title="Receita Mensal"
          value="R$ 86.400"
          trend={{ value: 12, isPositive: true }}
          icon={DollarSign}
          delay={5}
        />
        <MetricCard
          title="Peso Total Operacional"
          value={142}
          subtitle="Capacidade: 180"
          icon={Clock}
          status="attention"
          delay={6}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks Overview - 2 columns */}
        <div className="lg:col-span-2">
          <TasksOverview />
        </div>

        {/* Team Capacity - 1 column */}
        <div>
          <TeamCapacity />
        </div>
      </div>

      {/* Contract Alerts & Client Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ContractsAlert />
        <ClientsHealth />
      </div>
    </div>
  );
}
