import { motion } from "framer-motion";
import { Plus, Search, Filter, MoreHorizontal, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  client: string;
  module: string;
  type: "recurring" | "planning" | "project" | "extra";
  assignee: string;
  assigneeRole: string;
  dueDate: string;
  status: "todo" | "in_progress" | "review" | "done";
  weight: number;
  isOverdue: boolean;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Criar campanha Black Friday",
    client: "Loja Fashion",
    module: "Gestão de Tráfego",
    type: "project",
    assignee: "Ana Silva",
    assigneeRole: "Gestor de Tráfego",
    dueDate: "2024-01-15",
    status: "in_progress",
    weight: 4,
    isOverdue: true,
  },
  {
    id: "2",
    title: "Posts Instagram - Semana 3",
    client: "Restaurante Bella",
    module: "Design",
    type: "recurring",
    assignee: "Carlos Santos",
    assigneeRole: "Designer",
    dueDate: "2024-01-16",
    status: "review",
    weight: 2,
    isOverdue: false,
  },
  {
    id: "3",
    title: "Planejamento Mensal Fevereiro",
    client: "Tech Solutions",
    module: "",
    type: "planning",
    assignee: "Maria Costa",
    assigneeRole: "Copywriter",
    dueDate: "2024-01-31",
    status: "todo",
    weight: 1,
    isOverdue: false,
  },
  {
    id: "4",
    title: "Landing Page Promoção Verão",
    client: "Fit Academia",
    module: "Landing Pages",
    type: "extra",
    assignee: "João Mendes",
    assigneeRole: "Designer",
    dueDate: "2024-01-14",
    status: "in_progress",
    weight: 3,
    isOverdue: true,
  },
  {
    id: "5",
    title: "Textos para Blog - Janeiro",
    client: "Tech Solutions",
    module: "Copywriting",
    type: "recurring",
    assignee: "Maria Costa",
    assigneeRole: "Copywriter",
    dueDate: "2024-01-20",
    status: "todo",
    weight: 2,
    isOverdue: false,
  },
  {
    id: "6",
    title: "Identidade Visual Completa",
    client: "Nova Startup",
    module: "Identidade Visual",
    type: "project",
    assignee: "Carlos Santos",
    assigneeRole: "Designer",
    dueDate: "2024-01-25",
    status: "in_progress",
    weight: 4,
    isOverdue: false,
  },
];

const statusConfig = {
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary" },
  review: { label: "Revisão", color: "bg-warning/20 text-warning" },
  done: { label: "Entregue", color: "bg-success/20 text-success" },
};

const typeConfig = {
  recurring: { label: "Entrega recorrente", color: "border-blue-500/30 text-blue-500" },
  planning: { label: "Planejamento", color: "border-purple-500/30 text-purple-500" },
  project: { label: "Projeto", color: "border-primary/30 text-primary" },
  extra: { label: "Extra", color: "border-orange-500/30 text-orange-500" },
};

export default function Tasks() {
  const overdueTasks = mockTasks.filter((t) => t.isOverdue);
  const totalWeight = mockTasks.filter((t) => t.status !== "done").reduce((acc, t) => acc + t.weight, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground">Motor de entregas e produção</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </motion.div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {overdueTasks.length} tarefa{overdueTasks.length > 1 ? "s" : ""} atrasada{overdueTasks.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Atenção imediata necessária para evitar impacto nos clientes
            </p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." className="pl-9" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-4"
      >
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Ativas</p>
          <p className="text-2xl font-bold text-foreground">
            {mockTasks.filter((t) => t.status !== "done").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 border-destructive/20">
          <p className="text-sm text-muted-foreground">Atrasadas</p>
          <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Em Revisão</p>
          <p className="text-2xl font-bold text-warning">
            {mockTasks.filter((t) => t.status === "review").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Peso Total</p>
          <p className="text-2xl font-bold text-foreground">{totalWeight}</p>
        </div>
      </motion.div>

      {/* Tasks List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        {mockTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
            className={cn(
              "glass rounded-xl p-5 transition-all hover:shadow-lg group",
              task.isOverdue && "border-destructive/30 bg-destructive/5"
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    task.isOverdue
                      ? "bg-destructive/10 text-destructive"
                      : task.status === "done"
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {task.isOverdue ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : task.status === "done" ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{task.title}</h3>
                    <Badge variant="outline" className={cn("text-xs", typeConfig[task.type].color)}>
                      {typeConfig[task.type].label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Peso: {task.weight}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{task.client}</span>
                    {task.module && (
                      <>
                        <span>·</span>
                        <span>{task.module}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{task.assignee}</span>
                    <span className="text-xs">({task.assigneeRole})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge className={cn(statusConfig[task.status].color)}>
                    {statusConfig[task.status].label}
                  </Badge>
                  <p className={cn(
                    "text-xs mt-1",
                    task.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    {task.isOverdue ? "Atrasada" : `Prazo: ${new Date(task.dueDate).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <button className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
