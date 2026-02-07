 import { motion } from "framer-motion";
 import { useMemo } from "react";
 import { Clock, AlertTriangle, CheckCircle, MoreHorizontal, Calendar, Building2, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, parseLocalDate } from "@/lib/utils";
import type { Task, TeamMember, TaskPriority, Client } from "@/types/tasks";
import { taskStatusConfig, taskTypeConfig, priorityConfig } from "@/types/tasks";
 import { DatePopover, PriorityPopover, ClientPopover } from "./InlineFieldPopover";
 import { MultiAssigneePopover } from "./MultiAssigneePopover";
 import { StackedAvatars } from "./StackedAvatars";
 import { useTasksAssignees, useSetTaskAssignees } from "@/hooks/useTaskAssignees";
import { format } from "date-fns";

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string, initialTab?: string) => void;
  onUpdateField?: (taskId: string, field: string, value: unknown) => void;
  teamMembers?: TeamMember[];
  clients?: Client[];
}

export function TaskListView({ tasks, onTaskClick, onUpdateField, teamMembers = [], clients = [] }: TaskListViewProps) {
   // Fetch all task assignees
   const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
   const { data: assigneesByTask = {} } = useTasksAssignees(taskIds);
   const setAssignees = useSetTaskAssignees();
 
   const handleSetAssignees = (taskId: string, memberIds: string[]) => {
     setAssignees.mutate({ taskId, memberIds });
   };
 
   const isOverdue = (task: Task) => {
    return parseLocalDate(task.due_date) < new Date() && task.status !== "done";
  };

  const handleFieldClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="space-y-3">
       {tasks.map((task, index) => {
        const priority = task.priority as TaskPriority || "medium";
        const priorityInfo = priorityConfig[priority];
         const taskAssignees = (assigneesByTask[task.id] || []).map(a => a.team_member).filter(Boolean) as TeamMember[];
        
        // Checklist progress
        const checklistTotal = task.checklist?.length || 0;
        const checklistCompleted = task.checklist?.filter(i => i.is_completed).length || 0;
        const checklistProgress = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;
        
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
                    {/* Cliente - Clicável */}
                    <ClientPopover
                      currentClient={task.client}
                      clients={clients}
                      onSelect={(clientId) => onUpdateField?.(task.id, "client_id", clientId)}
                    >
                      <button
                        type="button"
                        onClick={handleFieldClick}
                        onPointerDown={handleFieldClick}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Building2 className="h-3 w-3" />
                        <span className="truncate max-w-[220px]">{task.client?.name || "Sem cliente"}</span>
                      </button>
                    </ClientPopover>
                    {task.contract_module?.service_module?.name && (
                      <>
                        <span>·</span>
                        <span>{task.contract_module.service_module.name}</span>
                      </>
                    )}
                    <span>·</span>
                    {/* Responsável - Clicável */}
                     <MultiAssigneePopover
                       currentAssignees={taskAssignees}
                      teamMembers={teamMembers}
                       onSelect={(memberIds) => handleSetAssignees(task.id, memberIds)}
                    >
                      <button
                        type="button"
                        onClick={handleFieldClick}
                        onPointerDown={handleFieldClick}
                         className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                         <StackedAvatars assignees={taskAssignees} maxVisible={3} size="sm" />
                      </button>
                     </MultiAssigneePopover>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                  <div className="text-right space-y-1">
                  <Badge className={cn(taskStatusConfig[task.status].color)}>
                    {taskStatusConfig[task.status].label}
                  </Badge>
                  {/* Prioridade - Clicável */}
                  <PriorityPopover
                    currentPriority={priority}
                    onSelect={(newPriority) => onUpdateField?.(task.id, "priority", newPriority)}
                  >
                    <button type="button" className="inline-flex ml-2" onClick={handleFieldClick} onPointerDown={handleFieldClick}>
                      <Badge className={cn("text-xs cursor-pointer hover:opacity-80 transition-opacity", priorityInfo.color)}>
                        {priorityInfo.label}
                      </Badge>
                    </button>
                  </PriorityPopover>
                  
                  {/* Checklist Progress - Clickable */}
                  {checklistTotal > 0 && (
                    <div 
                      className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:opacity-80"
                      onClick={(e) => { e.stopPropagation(); onTaskClick?.(task.id, "checklist"); }}
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>{checklistCompleted}/{checklistTotal}</span>
                      <Progress value={checklistProgress} className="h-1.5 w-16" />
                    </div>
                  )}
                  
                  {/* Data - Clicável */}
                  <div onClick={handleFieldClick} onPointerDown={handleFieldClick}>
                    <DatePopover
                      currentDate={parseLocalDate(task.due_date)}
                      onSelect={(date) => {
                        const yyyy = date.getFullYear();
                        const mm = String(date.getMonth() + 1).padStart(2, "0");
                        const dd = String(date.getDate()).padStart(2, "0");
                        onUpdateField?.(task.id, "due_date", `${yyyy}-${mm}-${dd}`);
                      }}
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
