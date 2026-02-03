import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  client: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in_progress" | "review" | "done";
  isOverdue: boolean;
  weight: number;
  type: string;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Criar campanha Black Friday",
    client: "Loja Fashion",
    assignee: "Ana Silva",
    dueDate: "2024-01-15",
    status: "in_progress",
    isOverdue: true,
    weight: 4,
    type: "Projeto",
  },
  {
    id: "2",
    title: "Posts Instagram - Semana 3",
    client: "Restaurante Bella",
    assignee: "Carlos Santos",
    dueDate: "2024-01-16",
    status: "review",
    isOverdue: false,
    weight: 2,
    type: "Entrega recorrente",
  },
  {
    id: "3",
    title: "Planejamento Mensal",
    client: "Tech Solutions",
    assignee: "Maria Costa",
    dueDate: "2024-01-20",
    status: "todo",
    isOverdue: false,
    weight: 1,
    type: "Planejamento",
  },
  {
    id: "4",
    title: "Landing Page Promoção",
    client: "Fit Academia",
    assignee: "João Mendes",
    dueDate: "2024-01-14",
    status: "in_progress",
    isOverdue: true,
    weight: 3,
    type: "Extra",
  },
];

const statusConfig = {
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary" },
  review: { label: "Revisão", color: "bg-warning/20 text-warning" },
  done: { label: "Entregue", color: "bg-success/20 text-success" },
};

export function TasksOverview() {
  const overdueTasks = mockTasks.filter((t) => t.isOverdue);
  const activeTasks = mockTasks.filter((t) => !t.isOverdue && t.status !== "done");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-xl p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Tarefas Ativas
          </h3>
          <p className="text-sm text-muted-foreground">
            {overdueTasks.length} atrasadas · {activeTasks.length} em andamento
          </p>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Ver todas
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {mockTasks.slice(0, 4).map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className={cn(
              "group flex items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted/50",
              task.isOverdue
                ? "border-destructive/30 bg-destructive/5"
                : "border-border"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                task.isOverdue
                  ? "bg-destructive/10 text-destructive"
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">
                  {task.title}
                </p>
                <Badge variant="outline" className="shrink-0 text-xs">
                  Peso: {task.weight}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{task.client}</span>
                <span>·</span>
                <span>{task.assignee}</span>
                <span>·</span>
                <span className="text-xs">{task.type}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className={cn("shrink-0", statusConfig[task.status].color)}>
                {statusConfig[task.status].label}
              </Badge>
              {task.isOverdue && (
                <span className="text-xs font-medium text-destructive">
                  Atrasada
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
