import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/tasks";
import { taskStatusConfig, taskTypeConfig } from "@/types/tasks";

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export const TaskListView = forwardRef<HTMLDivElement, TaskListViewProps>(
  function TaskListView({ tasks, onTaskClick }, ref) {
  const isOverdue = (task: Task) => {
    return new Date(task.due_date) < new Date() && task.status !== "done";
  };

  return (
    <div ref={ref} className="space-y-3">
      {tasks.map((task, index) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 * index }}
          onClick={() => onTaskClick?.(task.id)}
          className={cn(
            "glass rounded-xl p-5 transition-all hover:shadow-lg group cursor-pointer",
            isOverdue(task) && "border-destructive/30 bg-destructive/5"
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  isOverdue(task)
                    ? "bg-destructive/10 text-destructive"
                    : task.status === "done"
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary"
                )}
              >
                {isOverdue(task) ? (
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
                  <Badge variant="outline" className={cn("text-xs", taskTypeConfig[task.type].color)}>
                    {taskTypeConfig[task.type].label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Peso: {task.weight}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{task.client?.name}</span>
                  {task.contract_module?.service_module?.name && (
                    <>
                      <span>·</span>
                      <span>{task.contract_module.service_module.name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{task.assignee?.name || "Não atribuído"}</span>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    {task.required_role}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge className={cn(taskStatusConfig[task.status].color)}>
                  {taskStatusConfig[task.status].label}
                </Badge>
                <p className={cn(
                  "text-xs mt-1",
                  isOverdue(task) ? "text-destructive font-medium" : "text-muted-foreground"
                )}>
                  {isOverdue(task) ? "Atrasada" : `Prazo: ${new Date(task.due_date).toLocaleDateString("pt-BR")}`}
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
});
