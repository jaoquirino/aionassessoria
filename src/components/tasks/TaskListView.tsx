import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, MoreHorizontal, User, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, parseLocalDate } from "@/lib/utils";
import type { Task, TeamMember, TaskPriority } from "@/types/tasks";
import { taskStatusConfig, taskTypeConfig, priorityConfig } from "@/types/tasks";
import { AssigneePopover, DatePopover, RolePopover, PriorityPopover } from "./InlineFieldPopover";
import { format } from "date-fns";

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onUpdateField?: (taskId: string, field: string, value: unknown) => void;
  teamMembers?: TeamMember[];
}

export function TaskListView({ tasks, onTaskClick, onUpdateField, teamMembers = [] }: TaskListViewProps) {
  const isOverdue = (task: Task) => {
    return parseLocalDate(task.due_date) < new Date() && task.status !== "done";
  };

  const handleFieldClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => {
        const priority = task.priority as TaskPriority || "medium";
        const priorityInfo = priorityConfig[priority];
        
        return (
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
                    {/* Responsável - Clicável */}
                    <div onClick={handleFieldClick}>
                      <AssigneePopover
                        currentAssignee={task.assignee}
                        teamMembers={teamMembers}
                        onSelect={(memberId) => onUpdateField?.(task.id, "assigned_to", memberId)}
                      >
                        <span className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee?.name || "Não atribuído"}
                        </span>
                      </AssigneePopover>
                    </div>
                    {/* Área (required_role) - Clicável */}
                    <div onClick={handleFieldClick}>
                      <RolePopover
                        currentRole={task.required_role}
                        onSelect={(newRole) => onUpdateField?.(task.id, "required_role", newRole)}
                      >
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary cursor-pointer hover:opacity-80 transition-opacity">
                          {task.required_role}
                        </Badge>
                      </RolePopover>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right space-y-1">
                  <Badge className={cn(taskStatusConfig[task.status].color)}>
                    {taskStatusConfig[task.status].label}
                  </Badge>
                  {/* Prioridade - Clicável */}
                  <div onClick={handleFieldClick} className="inline-block ml-2">
                    <PriorityPopover
                      currentPriority={priority}
                      onSelect={(newPriority) => onUpdateField?.(task.id, "priority", newPriority)}
                    >
                      <Badge className={cn("text-xs cursor-pointer hover:opacity-80 transition-opacity", priorityInfo.color)}>
                        {priorityInfo.label}
                      </Badge>
                    </PriorityPopover>
                  </div>
                  {/* Data - Clicável */}
                  <div onClick={handleFieldClick}>
                    <DatePopover
                      currentDate={parseLocalDate(task.due_date)}
                      onSelect={(date) => onUpdateField?.(task.id, "due_date", format(date, "yyyy-MM-dd"))}
                    >
                      <p className={cn(
                        "text-xs cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 justify-end",
                        isOverdue(task) ? "text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        <Calendar className="h-3 w-3" />
                        {isOverdue(task) ? "Atrasada" : `Prazo: ${parseLocalDate(task.due_date).toLocaleDateString("pt-BR")}`}
                      </p>
                    </DatePopover>
                  </div>
                </div>
                <button className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}

      {tasks.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nenhuma tarefa encontrada com os filtros aplicados</p>
        </div>
      )}
    </div>
  );
}
