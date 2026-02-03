import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, GripVertical, Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task, TaskStatusDB } from "@/types/tasks";
import { taskStatusConfig, taskTypeConfig } from "@/types/tasks";

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatusDB) => void;
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (status: TaskStatusDB) => void;
}

const columns: TaskStatusDB[] = ["todo", "in_progress", "review", "waiting_client", "done"];

export function TaskKanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask }: TaskKanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatusDB | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, column: TaskStatusDB) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDrop = (e: React.DragEvent, column: TaskStatusDB) => {
    e.preventDefault();
    if (draggedTask && onTaskMove) {
      onTaskMove(draggedTask, column);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getTasksByStatus = (status: TaskStatusDB) => tasks.filter((t) => t.status === status);

  const isOverdue = (task: Task) => {
    return new Date(task.due_date) < new Date() && task.status !== "done";
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column);
        const totalWeight = columnTasks.reduce((acc, t) => acc + t.weight, 0);

        return (
          <motion.div
            key={column}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border-2 border-dashed p-3 min-h-[500px] min-w-[280px] w-[280px] flex-shrink-0 snap-start transition-colors",
              column === "todo" && "bg-muted/50 border-muted-foreground/20",
              column === "in_progress" && "bg-primary/10 border-primary/30",
              column === "review" && "bg-warning/10 border-warning/30",
              column === "waiting_client" && "bg-blue-500/10 border-blue-500/30",
              column === "done" && "bg-success/10 border-success/30",
              dragOverColumn === column && "border-primary bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, column)}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">
                  {taskStatusConfig[column].label}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {columnTasks.length}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                P{totalWeight}
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
                  onClick={() => onTaskClick?.(task.id)}
                  className={cn(
                    "glass rounded-lg p-3 cursor-pointer active:cursor-grabbing group transition-all hover:shadow-md",
                    draggedTask === task.id && "opacity-50 scale-95",
                    isOverdue(task) && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-foreground text-sm line-clamp-2">
                          {task.title}
                        </p>
                        {isOverdue(task) && (
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className={cn("text-xs", taskTypeConfig[task.type].color)}>
                          {taskTypeConfig[task.type].label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          P{task.weight}
                        </Badge>
                      </div>

                      {/* Required Role - Highlighted */}
                      <div className="mb-2">
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {task.required_role}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">{task.client?.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="truncate">
                            {task.assignee?.name || "Não atribuído"}
                          </span>
                          <span className={cn(
                            "flex items-center gap-1",
                            isOverdue(task) ? "text-destructive font-medium" : ""
                          )}>
                            <Clock className="h-3 w-3" />
                            {isOverdue(task) 
                              ? "Atrasada" 
                              : new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {columnTasks.length === 0 && (
                <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                  Nenhuma tarefa
                </div>
              )}

              {/* Add Task Button - Trello Style */}
              {column !== "done" && onAddTask && (
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
