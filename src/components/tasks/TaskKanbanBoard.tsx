import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, GripVertical, Clock, Plus, User, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, TaskStatusDB, TaskPriority } from "@/types/tasks";
import { taskStatusConfig, priorityConfig } from "@/types/tasks";

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatusDB) => void;
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (status: TaskStatusDB) => void;
}

// Colunas incluindo "overdue" como primeira
type KanbanColumn = "overdue" | TaskStatusDB;
const columns: KanbanColumn[] = ["overdue", "todo", "in_progress", "review", "waiting_client", "done"];

export function TaskKanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask }: TaskKanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, column: KanbanColumn) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDrop = (e: React.DragEvent, column: KanbanColumn) => {
    e.preventDefault();
    // Não permite drop na coluna "overdue" - ela é automática
    if (draggedTask && onTaskMove && column !== "overdue") {
      onTaskMove(draggedTask, column);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const isOverdue = (task: Task) => {
    return new Date(task.due_date) < new Date() && task.status !== "done";
  };

  // Organizar tarefas por coluna
  const tasksByColumn = useMemo(() => {
    const result: Record<KanbanColumn, Task[]> = {
      overdue: [],
      todo: [],
      in_progress: [],
      review: [],
      waiting_client: [],
      done: [],
    };

    tasks.forEach((task) => {
      if (isOverdue(task)) {
        result.overdue.push(task);
      } else {
        result[task.status].push(task);
      }
    });

    // Ordenar por prioridade
    const priorityOrder = (p: TaskPriority) => priorityConfig[p]?.order || 99;
    
    Object.keys(result).forEach((key) => {
      result[key as KanbanColumn].sort((a, b) => 
        priorityOrder(a.priority as TaskPriority) - priorityOrder(b.priority as TaskPriority)
      );
    });

    return result;
  }, [tasks]);

  const getColumnConfig = (column: KanbanColumn) => {
    if (column === "overdue") {
      return {
        bgClass: "bg-destructive/10 border-destructive/30",
        label: "Pra ontem 🔥",
      };
    }
    
    const configs: Record<TaskStatusDB, { bgClass: string; label: string }> = {
      todo: { bgClass: "bg-muted/50 border-muted-foreground/20", label: taskStatusConfig.todo.label },
      in_progress: { bgClass: "bg-primary/10 border-primary/30", label: taskStatusConfig.in_progress.label },
      review: { bgClass: "bg-warning/10 border-warning/30", label: taskStatusConfig.review.label },
      waiting_client: { bgClass: "bg-info/10 border-info/30", label: taskStatusConfig.waiting_client.label },
      done: { bgClass: "bg-success/10 border-success/30", label: taskStatusConfig.done.label },
    };
    return configs[column];
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
      {columns.map((column) => {
        const columnTasks = tasksByColumn[column];
        const totalWeight = columnTasks.reduce((acc, t) => acc + t.weight, 0);
        const config = getColumnConfig(column);

        return (
          <motion.div
            key={column}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border-2 border-dashed p-3 min-h-[500px] min-w-[280px] w-[280px] flex-shrink-0 snap-start transition-colors",
              config.bgClass,
              dragOverColumn === column && column !== "overdue" && "border-primary bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, column)}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-semibold text-sm",
                  column === "overdue" ? "text-destructive" : "text-foreground"
                )}>
                  {config.label}
                </h3>
                <Badge variant={column === "overdue" ? "destructive" : "secondary"} className="text-xs">
                  {columnTasks.length}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                P{totalWeight}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  isOverdue={column === "overdue" || isOverdue(task)}
                  isDragging={draggedTask === task.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskClick?.(task.id)}
                />
              ))}

              {/* Add Task Button */}
              {column !== "done" && column !== "overdue" && onAddTask && (
                <button
                  onClick={() => onAddTask(column)}
                  className="w-full rounded-lg border-2 border-dashed border-muted-foreground/30 p-3 flex items-center justify-center gap-2 text-muted-foreground/60 hover:border-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Adicionar tarefa</span>
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  index: number;
  isOverdue: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function TaskCard({ task, index, isOverdue, isDragging, onDragStart, onDragEnd, onClick }: TaskCardProps) {
  const priority = task.priority as TaskPriority || "medium";
  const priorityInfo = priorityConfig[priority];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, task.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "glass rounded-lg p-3 cursor-pointer active:cursor-grabbing group transition-all hover:shadow-md",
        isDragging && "opacity-50 scale-95",
        isOverdue && "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Título */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground text-sm line-clamp-2">
              {task.title}
            </p>
            {isOverdue && (
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            )}
          </div>

          {/* Cliente */}
          <p className="text-xs text-muted-foreground truncate font-medium">
            {task.client?.name || "Sem cliente"}
          </p>

          {/* Prioridade */}
          <Badge className={cn("text-xs", priorityInfo.color)}>
            {priorityInfo.label}
          </Badge>

          {/* Área (required_role) */}
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
            {task.required_role}
          </Badge>

          {/* Responsável */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">
              {task.assignee?.name || "Não atribuído"}
            </span>
          </div>

          {/* Data de entrega e aviso de atraso */}
          <div className={cn(
            "flex items-center gap-1 text-xs pt-1 border-t border-border/50",
            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.due_date)}</span>
            {isOverdue && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[10px] font-semibold">
                ATRASADA
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
