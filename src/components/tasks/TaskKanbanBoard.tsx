 import { useState, useMemo, useEffect } from "react";
 import { motion, Reorder } from "framer-motion";
 import { AlertTriangle, GripVertical, Plus, Calendar, MoreHorizontal, Archive, Pencil, CheckSquare, Image, Video, CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, parseLocalDate } from "@/lib/utils";
import type { Task, TaskStatusDB, TaskPriority, TeamMember, Client } from "@/types/tasks";
import { taskStatusConfig, priorityConfig } from "@/types/tasks";
import { PriorityBadge } from "./PriorityBadge";
 import { DatePopover, PriorityPopover, ClientPopover } from "./InlineFieldPopover";
 import { MultiAssigneePopover } from "./MultiAssigneePopover";
 import { StackedAvatars } from "./StackedAvatars";
 import { KanbanColumnMenu, AddColumnDialog, getColumnColorStyle, getColumnColorClass } from "./KanbanColumnMenu";
 import { useKanbanColumns, useUpdateKanbanColumn, useDeleteKanbanColumn, useCreateKanbanColumn, useReorderKanbanColumns, type KanbanColumn } from "@/hooks/useKanbanColumns";
 import { useTasksAssignees, useSetTaskAssignees } from "@/hooks/useTaskAssignees";
import { useTasksSubtaskCounts } from "@/hooks/useSubtasks";
import { usePriorities } from "@/hooks/usePriorities";
import { format } from "date-fns";

 interface TaskKanbanBoardProps {
   tasks: Task[];
   onTaskMove?: (taskId: string, newStatus: TaskStatusDB) => void;
   onTaskClick?: (taskId: string, initialTab?: string) => void;
   onAddTask?: (status: TaskStatusDB) => void;
   onUpdateField?: (taskId: string, field: string, value: unknown) => void;
   onArchiveTask?: (taskId: string) => void;
   onUpdateStatus?: (taskId: string, status: TaskStatusDB) => void;
   teamMembers?: TeamMember[];
   clients?: Client[];
 }
 
 type KanbanColumnKey = "overdue" | TaskStatusDB | string;

export function TaskKanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask, onUpdateField, onArchiveTask, onUpdateStatus, teamMembers = [], clients = [] }: TaskKanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
   const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnKey | null>(null);
   const [addColumnOpen, setAddColumnOpen] = useState(false);
   const [addColumnAfterIndex, setAddColumnAfterIndex] = useState<number>(0);
 
   // Fetch dynamic columns
   const { data: kanbanColumns = [] } = useKanbanColumns();
   const updateColumn = useUpdateKanbanColumn();
   const deleteColumn = useDeleteKanbanColumn();
   const createColumn = useCreateKanbanColumn();
   const reorderColumns = useReorderKanbanColumns();
 
   // Fetch all task assignees
   const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
   const { data: assigneesByTask = {} } = useTasksAssignees(taskIds);
   const { data: subtaskCounts = {} } = useTasksSubtaskCounts(taskIds);
   const setAssignees = useSetTaskAssignees();
   const { data: dbPriorities = [] } = usePriorities();

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

   const handleDragOver = (e: React.DragEvent, column: KanbanColumnKey) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

   const handleDrop = (e: React.DragEvent, column: KanbanColumnKey) => {
    e.preventDefault();
    // Não permite drop na coluna "overdue" - ela é automática
     if (draggedTask && onTaskMove && column !== "overdue") {
       // Map column key to valid TaskStatusDB (for custom columns, map to closest)
       const validStatuses: TaskStatusDB[] = ["todo", "in_progress", "review", "waiting_client", "done"];
       const targetStatus = validStatuses.includes(column as TaskStatusDB) 
         ? (column as TaskStatusDB) 
         : "todo";
       onTaskMove(draggedTask, targetStatus);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // Check if task is overdue - ONLY based on date, not priority
  const isOverdue = (task: Task) => {
    return parseLocalDate(task.due_date) < new Date() && task.status !== "done";
  };

  // Check if task should be in "pra ontem" column based on urgent priority OR overdue date
  // Tasks marked as "done" should NOT appear in the overdue column
  const isUrgentOrOverdue = (task: Task) => {
    if (task.status === "done") return false;
    return task.priority === "urgent" || isOverdue(task);
  };

  // Organizar tarefas por coluna
  const tasksByColumn = useMemo(() => {
     const result: Record<string, Task[]> = {};
     
     // Initialize all columns
     kanbanColumns.forEach(col => {
       result[col.key] = [];
     });

    tasks.forEach((task) => {
      if (isUrgentOrOverdue(task)) {
         if (result.overdue) {
           result.overdue.push(task);
         }
      } else {
         if (result[task.status]) {
           result[task.status].push(task);
         }
      }
    });

    // Ordenar por prioridade
    const priorityOrderMap = Object.fromEntries(dbPriorities.map(p => [p.key, p.order_index]));
    const priorityOrder = (p: TaskPriority) => priorityOrderMap[p] ?? priorityConfig[p]?.order ?? 99;
    
     Object.keys(result).forEach((key) => {
       result[key].sort((a, b) => 
        priorityOrder(a.priority as TaskPriority) - priorityOrder(b.priority as TaskPriority)
      );
    });

    return result;
   }, [tasks, kanbanColumns]);
 
   // Handle column operations
   const handleEditColumn = (id: string, label: string, colorClass: string) => {
     updateColumn.mutate({ id, label, color_class: colorClass });
   };
 
   const handleDeleteColumn = (id: string) => {
     deleteColumn.mutate(id);
   };
 
   const handleAddColumnAfter = (afterIndex: number) => {
     setAddColumnAfterIndex(afterIndex);
     setAddColumnOpen(true);
   };
 
   const handleCreateColumn = (label: string, colorClass: string) => {
     // Generate unique key from label
     const key = label.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
     createColumn.mutate({
       key,
       label,
       color_class: colorClass,
       order_index: addColumnAfterIndex + 1,
     });
   };
 
   // Handle multiple assignees
   const handleSetAssignees = (taskId: string, memberIds: string[]) => {
     setAssignees.mutate({ taskId, memberIds });
   };

  return (
     <>
       <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
         {kanbanColumns.map((column) => {
           const columnTasks = tasksByColumn[column.key] || [];
        

        return (
          <motion.div
             key={column.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border-2 border-dashed p-3 min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors",
               getColumnColorClass(column.color_class),
               dragOverColumn === column.key && column.key !== "overdue" && "border-primary bg-primary/5"
            )}
            style={getColumnColorStyle(column.color_class)}
             onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={() => setDragOverColumn(null)}
             onDrop={(e) => handleDrop(e, column.key)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-semibold text-sm",
                   column.key === "overdue" ? "text-destructive" : "text-foreground"
                )}>
                   {column.label}
                </h3>
                 <Badge variant={column.key === "overdue" ? "destructive" : "secondary"} className="text-xs">
                  {columnTasks.length}
                </Badge>
              </div>
               <div className="flex items-center gap-1">
                 <KanbanColumnMenu
                   column={column}
                   onEdit={handleEditColumn}
                   onDelete={handleDeleteColumn}
                   onAddAfter={handleAddColumnAfter}
                 />
               </div>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  isOverdue={isOverdue(task)}
                  isDragging={draggedTask === task.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={(tab) => onTaskClick?.(task.id, tab)}
                  onUpdateField={onUpdateField}
                   onArchive={onArchiveTask}
                   onUpdateStatus={onUpdateStatus}
                   teamMembers={teamMembers}
                   clients={clients}
                    assignees={(assigneesByTask[task.id] || []).map(a => a.team_member).filter(Boolean) as TeamMember[]}
                    onSetAssignees={(memberIds) => handleSetAssignees(task.id, memberIds)}
                    subtaskCount={subtaskCounts[task.id]}
                />
              ))}

              {/* Add Task Button */}
               {column.key !== "done" && column.key !== "overdue" && onAddTask && (
                <button
                   onClick={() => {
                     const validStatuses: TaskStatusDB[] = ["todo", "in_progress", "review", "waiting_client", "done"];
                     const status = validStatuses.includes(column.key as TaskStatusDB) 
                       ? (column.key as TaskStatusDB) 
                       : "todo";
                     onAddTask(status);
                   }}
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
 
       <AddColumnDialog
         open={addColumnOpen}
         onOpenChange={setAddColumnOpen}
         onAdd={handleCreateColumn}
       />
     </>
  );
}

interface TaskCardProps {
  task: Task;
  index: number;
  isOverdue: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onClick: (initialTab?: string) => void;
  onUpdateField?: (taskId: string, field: string, value: unknown) => void;
  onArchive?: (taskId: string) => void;
  onUpdateStatus?: (taskId: string, status: TaskStatusDB) => void;
  teamMembers: TeamMember[];
  clients: Client[];
   assignees: TeamMember[];
   onSetAssignees: (memberIds: string[]) => void;
   subtaskCount?: { total: number; done: number; weight: number };
}

 function TaskCard({ task, index, isOverdue, isDragging, onDragStart, onDragEnd, onClick, onUpdateField, onArchive, onUpdateStatus, teamMembers, clients, assignees, onSetAssignees, subtaskCount }: TaskCardProps) {
  const priority = task.priority as TaskPriority || "medium";
  const priorityInfo = priorityConfig[priority];

  // Checklist progress
  const checklistTotal = task.checklist?.length || 0;
  const checklistCompleted = task.checklist?.filter(i => i.is_completed).length || 0;
  const checklistProgress = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const handleFieldClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, task.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick()}
      className={cn(
        "glass rounded-lg p-3 cursor-pointer active:cursor-grabbing group transition-all hover:shadow-md overflow-hidden",
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
             <div className="flex items-center gap-1 shrink-0">
               {isOverdue && (
                 <AlertTriangle className="h-4 w-4 text-destructive" />
               )}
               {/* Quick status action button */}
               {task.status === "done" ? (
                 <button
                   className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                   title="Voltar para Em produção"
                   onClick={(e) => { e.stopPropagation(); onUpdateStatus?.(task.id, "in_progress"); }}
                 >
                   <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                 </button>
               ) : (
                 <button
                   className="h-6 w-6 flex items-center justify-center rounded hover:bg-success/20 opacity-0 group-hover:opacity-100 transition-opacity"
                   title="Concluir tarefa"
                   onClick={(e) => { e.stopPropagation(); onUpdateStatus?.(task.id, "done"); }}
                 >
                   <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                 </button>
               )}
               <DropdownMenu>
                 <DropdownMenuTrigger asChild onClick={handleFieldClick}>
                   <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                     <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                   </button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="bg-background border-border">
                   <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                     <Pencil className="h-4 w-4 mr-2" />
                     Editar
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem 
                     onClick={(e) => { e.stopPropagation(); onArchive?.(task.id); }}
                     className="text-muted-foreground hover:!text-destructive hover:!bg-destructive/10"
                   >
                     <Archive className="h-4 w-4 mr-2" />
                     Arquivar
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
            </div>
          </div>

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
              className="flex items-center gap-1.5 w-full text-left"
            >
              {task.client?.logo_url ? (
                <img src={task.client.logo_url} alt="" className="w-4 h-4 object-contain shrink-0" />
              ) : task.client?.color ? (
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: task.client.color }} />
              ) : null}
              <p className="text-xs leading-tight text-muted-foreground truncate font-medium cursor-pointer hover:text-foreground transition-colors">
                {task.client?.name || "Sem cliente"}
              </p>
            </button>
          </ClientPopover>

          {/* Prioridade - Clicável */}
          <PriorityPopover
            currentPriority={priority}
            onSelect={(newPriority) => onUpdateField?.(task.id, "priority", newPriority)}
          >
            <button 
              type="button"
              onClick={handleFieldClick} 
              onPointerDown={handleFieldClick}
              className="inline-flex self-start"
            >
              <PriorityBadge priorityKey={priority} className="text-xs cursor-pointer hover:opacity-80 transition-opacity" />
            </button>
           </PriorityPopover>

          {/* Deliverable Type Badge (Arte/Vídeo) */}
          {task.deliverable_type && (
            <Badge variant="outline" className={cn(
              "text-xs gap-1",
              task.deliverable_type === "arte" ? "border-purple/30 text-purple" : "border-info/30 text-info"
            )}>
              {task.deliverable_type === "arte" ? <Image className="h-3 w-3" /> : <Video className="h-3 w-3" />}
              {task.deliverable_type === "arte" ? "Arte" : "Vídeo"}
            </Badge>
          )}

          {/* Responsável - Clicável */}
           <MultiAssigneePopover
             currentAssignees={assignees}
            teamMembers={teamMembers}
             onSelect={onSetAssignees}
             closeOnSelect
          >
            <button 
              type="button"
              onClick={handleFieldClick} 
              onPointerDown={handleFieldClick}
               className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
               <StackedAvatars assignees={assignees} maxVisible={3} />
            </button>
           </MultiAssigneePopover>

          {/* Checklist Progress - Clickable */}
          {checklistTotal > 0 && (
            <div 
              className="space-y-1 pt-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onClick("checklist"); }}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>{checklistCompleted}/{checklistTotal}</span>
                </div>
                <span>{Math.round(checklistProgress)}%</span>
              </div>
              <Progress value={checklistProgress} className="h-1.5" />
            </div>
          )}

          {/* Subtask Progress */}
          {subtaskCount && subtaskCount.total > 0 && (
            <div 
              className="space-y-1 pt-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onClick("checklist"); }}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>Subtarefas {subtaskCount.done}/{subtaskCount.total}</span>
                </div>
                <span>{Math.round((subtaskCount.done / subtaskCount.total) * 100)}%</span>
              </div>
              <Progress value={(subtaskCount.done / subtaskCount.total) * 100} className="h-1.5" />
            </div>
          )}

          {/* Data de entrega - Clicável */}
          <DatePopover
            currentDate={parseLocalDate(task.due_date)}
            onSelect={(date) => {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, "0");
              const dd = String(date.getDate()).padStart(2, "0");
              onUpdateField?.(task.id, "due_date", `${yyyy}-${mm}-${dd}`);
            }}
          >
            <button 
              type="button"
              onClick={handleFieldClick} 
              onPointerDown={handleFieldClick}
              className={cn(
                "flex items-center gap-1 text-xs pt-1 border-t border-border/50 cursor-pointer hover:opacity-80 transition-opacity w-full",
                isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.due_date)}</span>
              {isOverdue && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[10px] font-semibold">
                  ATRASADA
                </span>
              )}
            </button>
          </DatePopover>
        </div>
      </div>
    </motion.div>
  );
}
