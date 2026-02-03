import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "./TaskKanbanBoard";

interface TaskListViewProps {
  tasks: Task[];
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
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

export function TaskListView({ tasks }: TaskListViewProps) {
  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
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

      {tasks.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nenhuma tarefa encontrada com os filtros aplicados</p>
        </div>
      )}
    </div>
  );
}
