import { useState, useMemo } from "react";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodSelector, type PeriodOption, type CustomDateRange, getPeriodDates } from "@/components/dashboard/PeriodSelector";
import { useTasks } from "@/hooks/useTasks";
import { useAllClients } from "@/hooks/useClients";
import { useTasksAssignees } from "@/hooks/useTaskAssignees";
import { useTasksSubtaskCounts } from "@/hooks/useSubtasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/tasks";
import { Loader2, Clock, CheckCircle, AlertTriangle, Calendar, CornerDownRight, Video, Image, GalleryHorizontal, ChevronDown, ChevronRight } from "lucide-react";

import { cn, parseLocalDate } from "@/lib/utils";
import { getDeliverableTypeKind, getDeliverableTypeLabel } from "@/lib/deliverableType";

interface TeamMemberTasksDialogProps {
  member: {
    id: string;
    name: string;
    role: string;
    permission?: string;
    avatar_url: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string; borderColor: string }> = {
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground", borderColor: "border-l-muted-foreground" },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary", borderColor: "border-l-primary" },
  review: { label: "Revisão", color: "bg-warning/20 text-warning", borderColor: "border-l-warning" },
  waiting_client: { label: "Aguardando", color: "bg-info/20 text-info", borderColor: "border-l-info" },
  done: { label: "Entregue", color: "bg-success/20 text-success", borderColor: "border-l-success" },
};

export function TeamMemberTasksDialog({ member, open, onOpenChange }: TeamMemberTasksDialogProps) {
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>();
  const [activeTab, setActiveTab] = useState("active");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  const toggleParentCollapse = (parentId: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: clients = [] } = useAllClients();

  const { data: subtasks = [], isLoading: subtasksLoading } = useQuery({
    queryKey: ["member_subtasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .is("archived_at", null)
        .not("parent_task_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Task[];
    },
  });

  const combinedTasks = useMemo(() => [...allTasks, ...subtasks], [allTasks, subtasks]);
  
  const taskIds = useMemo(() => combinedTasks.map((t: Task) => t.id), [combinedTasks]);
  const { data: assigneesMap = {}, isLoading: assigneesLoading } = useTasksAssignees(taskIds);
  const { data: subtaskCounts = {} } = useTasksSubtaskCounts(taskIds);

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskDialogOpen(true);
  };

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, { name: c.name, logo_url: c.logo_url }])), [clients]);

  const memberTasks = useMemo(() => {
    if (!member) return { active: [] as Task[], completed: [] as Task[] };

    const { start, end } = getPeriodDates(period, customRange);
    
    const filteredTasks = combinedTasks.filter((task: Task) => {
      if (task.type === "onboarding") return false;
      
      const isAssignedLegacy = task.assigned_to === member.id;
      const taskAssignees = assigneesMap[task.id] || [];
      const isAssignedNew = taskAssignees.some(a => a.team_member_id === member.id);
      
      if (!isAssignedLegacy && !isAssignedNew) return false;
      
      const taskDate = parseLocalDate(task.due_date);
      return taskDate >= start && taskDate <= end;
    });

    // Group tasks: parent → children
    const groupTasks = (tasks: Task[]) => {
      const parentIdsWithChildren = new Set(
        tasks.filter(t => t.parent_task_id).map(t => t.parent_task_id!)
      );
      // Find parent tasks that have children but might not be in the filtered list
      const missingParents: Task[] = [];
      parentIdsWithChildren.forEach(pid => {
        if (!tasks.some(t => t.id === pid)) {
          const parent = combinedTasks.find(t => t.id === pid);
          if (parent) missingParents.push({ ...parent, _isParentGroup: true } as any);
        }
      });
      // Mark existing parents
      const allTasks = [...missingParents, ...tasks].map(t => ({
        ...t,
        _isParentGroup: parentIdsWithChildren.has(t.id) ? true : (t as any)._isParentGroup || false,
      }));

      const grouped: Task[] = [];
      const childMap = new Map<string, Task[]>();
      allTasks.forEach(t => {
        if (t.parent_task_id && parentIdsWithChildren.has(t.parent_task_id)) {
          const children = childMap.get(t.parent_task_id) || [];
          children.push(t);
          childMap.set(t.parent_task_id, children);
        }
      });
      const parents = allTasks.filter(t => (t as any)._isParentGroup);
      const standalone = allTasks.filter(t => !(t as any)._isParentGroup && (!t.parent_task_id || !parentIdsWithChildren.has(t.parent_task_id)));
      parents.forEach(p => {
        grouped.push(p);
        grouped.push(...(childMap.get(p.id) || []));
      });
      grouped.push(...standalone);
      return grouped;
    };

    return {
      active: groupTasks(filteredTasks.filter((t: Task) => t.status !== "done")),
      completed: groupTasks(filteredTasks.filter((t: Task) => t.status === "done")),
    };
  }, [combinedTasks, member, period, customRange, assigneesMap]);
 
   const now = new Date();
 
   if (!member) return null;

   const renderTaskCard = (task: Task, index: number, isCompletedTab: boolean) => {
     const isParentGroup = (task as any)._isParentGroup;
     const isOverdue = !isCompletedTab && !isParentGroup && parseLocalDate(task.due_date) < now;
     const client = clientMap.get(task.client_id);
     const status = statusConfig[task.status] || statusConfig.todo;
     const deliverableType = (task.deliverable_type || "").toLowerCase();

     // Parent group header
     if (isParentGroup) {
       const isCollapsed = collapsedParents.has(task.id);
       return (
         <motion.div
           key={task.id}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.03 * index }}
           className={cn(
             "rounded-lg border border-l-4 p-4 transition-all cursor-pointer hover:shadow-md",
             status.borderColor,
             "border-border hover:border-primary/30"
           )}
         >
           <div className="flex items-start justify-between gap-3">
             <div className="flex items-center gap-3 flex-1 min-w-0">
               <button
                 onClick={(e) => { e.stopPropagation(); toggleParentCollapse(task.id); }}
                 className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
               >
                 {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
               </button>
               <div className="flex-1 min-w-0" onClick={() => handleTaskClick(task.id)}>
                 <p className="font-semibold text-sm text-foreground truncate">{task.title}</p>
                 <div className="flex items-center gap-1.5 mt-1">
                   {client?.logo_url && (
                     <img src={client.logo_url} alt="" className="h-4 w-4 rounded object-contain shrink-0" />
                   )}
                   <p className="text-sm text-muted-foreground truncate">{client?.name || "—"}</p>
                 </div>
               </div>
             </div>
             <Badge className={cn(status.color)}>
               {status.label}
             </Badge>
           </div>
         </motion.div>
       );
     }

     return (
       <motion.div
         key={task.id}
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.03 * index }}
         onClick={() => handleTaskClick(task.parent_task_id || task.id)}
          className={cn(
            "rounded-lg border border-l-4 p-4 transition-all cursor-pointer hover:shadow-md",
            task.parent_task_id && "ml-6",
            status.borderColor,
            isOverdue ? "border-destructive/30 bg-destructive/5 border-l-destructive" : "border-border hover:border-primary/30"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {task.parent_task_id && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <p className="font-medium text-foreground truncate">{task.title}</p>
              </div>
              {!task.parent_task_id && (
                <div className="flex items-center gap-1.5 mt-1">
                  {client?.logo_url && (
                    <img src={client.logo_url} alt="" className="h-4 w-4 rounded object-contain shrink-0" />
                  )}
                  <p className="text-sm text-muted-foreground truncate">
                    {client?.name || "—"}
                  </p>
                </div>
              )}
           </div>
           <div className="flex items-center gap-2 shrink-0">
             {deliverableType && (
               <Badge variant="outline" className={cn(
                 "text-xs",
                  getDeliverableTypeKind(deliverableType) === "arte" ? "border-purple-500/30 text-purple-500" :
                  getDeliverableTypeKind(deliverableType) === "carrossel" ? "border-orange-500/30 text-orange-500" :
                  getDeliverableTypeKind(deliverableType) === "video" ? "border-info/30 text-info" :
                  "border-border text-muted-foreground"
               )}>
                  {getDeliverableTypeKind(deliverableType) === "arte" ? <><Image className="h-3 w-3 mr-1" />{getDeliverableTypeLabel(deliverableType)}</> :
                   getDeliverableTypeKind(deliverableType) === "carrossel" ? <><GalleryHorizontal className="h-3 w-3 mr-1" />{getDeliverableTypeLabel(deliverableType)}</> :
                   getDeliverableTypeKind(deliverableType) === "video" ? <><Video className="h-3 w-3 mr-1" />{getDeliverableTypeLabel(deliverableType)}</> :
                   getDeliverableTypeLabel(deliverableType)}
               </Badge>
             )}
             <Badge className={cn(status.color)}>
               {status.label}
             </Badge>
           </div>
         </div>
         <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
           <div className="flex items-center gap-1">
             <Calendar className="h-3.5 w-3.5" />
             <span>
               {isCompletedTab
                 ? `Entregue em ${format(new Date(task.updated_at), "dd 'de' MMM", { locale: ptBR })}`
                 : format(parseLocalDate(task.due_date), "dd 'de' MMM", { locale: ptBR })}
             </span>
           </div>
           {isOverdue && (
             <div className="flex items-center gap-1 text-destructive">
               <AlertTriangle className="h-3.5 w-3.5" />
               <span>Atrasada</span>
             </div>
           )}
           {subtaskCounts[task.id]?.total > 0 && (
             <span className="text-muted-foreground">
               {subtaskCounts[task.id].done}/{subtaskCounts[task.id].total} subtarefas
             </span>
           )}
         </div>
       </motion.div>
     );
   };
 
   return (
     <>
      <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
         <DialogHeader className="flex-shrink-0">
           <div className="flex items-center gap-4">
             <Avatar className="h-12 w-12">
               <AvatarImage src={member.avatar_url || undefined} />
               <AvatarFallback className="bg-primary/10 text-primary font-medium">
                 {member.name.split(" ").map(n => n[0]).join("")}
               </AvatarFallback>
             </Avatar>
              <div>
                <DialogTitle className="text-xl">{member.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {member.permission === "admin" ? "Admin" : "Operacional"}
                </p>
              </div>
           </div>
         </DialogHeader>
 
         <div className="flex items-center justify-between py-4 flex-shrink-0">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
             <TabsList>
               <TabsTrigger value="active" className="gap-2">
                 <Clock className="h-4 w-4" />
                 Ativas ({memberTasks.active.length})
               </TabsTrigger>
               <TabsTrigger value="completed" className="gap-2">
                 <CheckCircle className="h-4 w-4" />
                 Concluídas ({memberTasks.completed.length})
               </TabsTrigger>
             </TabsList>
           </Tabs>
            <PeriodSelector 
              value={period} 
              onChange={setPeriod} 
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
         </div>
 
         <div className="flex-1 overflow-y-auto min-h-0">
            {tasksLoading || subtasksLoading || assigneesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
             <>
               {activeTab === "active" && (
                 <div className="space-y-3">
                   {memberTasks.active.length === 0 ? (
                     <p className="text-center text-muted-foreground py-8">
                       Nenhuma tarefa ativa no período selecionado
                     </p>
                   ) : (
                     memberTasks.active.filter((t: Task) => !(t as any)._isParentGroup || true).filter((t: Task) => !t.parent_task_id || !collapsedParents.has(t.parent_task_id)).map((task: Task, index: number) => renderTaskCard(task, index, false))
                   )}
                 </div>
               )}
 
               {activeTab === "completed" && (
                 <div className="space-y-3">
                   {memberTasks.completed.length === 0 ? (
                     <p className="text-center text-muted-foreground py-8">
                       Nenhuma tarefa concluída no período selecionado
                     </p>
                   ) : (
                     memberTasks.completed.filter((t: Task) => !t.parent_task_id || !collapsedParents.has(t.parent_task_id)).map((task: Task, index: number) => renderTaskCard(task, index, true))
                   )}
                 </div>
               )}
             </>
           )}
          </div>
        </DialogContent>
      </Dialog>

      <TaskEditDialog
        taskId={selectedTaskId}
        open={taskDialogOpen}
        onOpenChange={(o) => {
          setTaskDialogOpen(o);
          if (!o) setSelectedTaskId(null);
        }}
      />
    </>
  );
}