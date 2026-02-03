import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, MoreHorizontal, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  client: string;
  module: string;
  type: "recurring" | "planning" | "project" | "extra";
  assignee: string;
  assigneeRole: string;
  dueDate: string;
  status: TaskStatus;
  weight: number;
  isOverdue: boolean;
}

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "A fazer", color: "bg-muted/50 border-muted-foreground/20" },
  in_progress: { label: "Em produção", color: "bg-primary/10 border-primary/30" },
  review: { label: "Revisão", color: "bg-warning/10 border-warning/30" },
  done: { label: "Entregue", color: "bg-success/10 border-success/30" },
};

const typeConfig = {
  recurring: { label: "Recorrente", color: "border-blue-500/30 text-blue-500" },
  planning: { label: "Planejamento", color: "border-purple-500/30 text-purple-500" },
  project: { label: "Projeto", color: "border-primary/30 text-primary" },
  extra: { label: "Extra", color: "border-orange-500/30 text-orange-500" },
};

const columns: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export function TaskKanbanBoard({ tasks, onTaskMove }: TaskKanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, column: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDrop = (e: React.DragEvent, column: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && onTaskMove) {
      onTaskMove(draggedTask, column);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getTasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column);
        const totalWeight = columnTasks.reduce((acc, t) => acc + t.weight, 0);

        return (
          <motion.div
            key={column}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border-2 border-dashed p-3 min-h-[500px] transition-colors",
              statusConfig[column].color,
              dragOverColumn === column && "border-primary bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, column)}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">
                  {statusConfig[column].label}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {columnTasks.length}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Peso: {totalWeight}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, task.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "glass rounded-lg p-3 cursor-grab active:cursor-grabbing group transition-all hover:shadow-md",
                    draggedTask === task.id && "opacity-50 scale-95",
                    task.isOverdue && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-foreground text-sm line-clamp-2">
                          {task.title}
                        </p>
                        {task.isOverdue && (
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className={cn("text-xs", typeConfig[task.type].color)}>
                          {typeConfig[task.type].label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          P{task.weight}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">{task.client}</p>
                        <div className="flex items-center justify-between">
                          <span className="truncate">{task.assignee}</span>
                          <span className={cn(
                            task.isOverdue ? "text-destructive font-medium" : ""
                          )}>
                            {task.isOverdue ? "Atrasada" : new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {columnTasks.length === 0 && (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Nenhuma tarefa
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
