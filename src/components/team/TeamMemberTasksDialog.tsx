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
import { Loader2, Clock, CheckCircle, AlertTriangle, Calendar, CornerDownRight } from "lucide-react";

import { cn, parseLocalDate } from "@/lib/utils";

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

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary" },
  review: { label: "Revisão", color: "bg-warning/20 text-warning" },
  waiting_client: { label: "Aguardando", color: "bg-info/20 text-info" },
  done: { label: "Entregue", color: "bg-success/20 text-success" },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  recurring: { label: "Recorrente", color: "bg-primary/10 text-primary" },
  planning: { label: "Planejamento", color: "bg-info/10 text-info" },
  project: { label: "Projeto", color: "bg-warning/10 text-warning" },
  extra: { label: "Extra", color: "bg-muted text-muted-foreground" },
};

export function TeamMemberTasksDialog({ member, open, onOpenChange }: TeamMemberTasksDialogProps) {
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>();
  const [activeTab, setActiveTab] = useState("active");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: clients = [] } = useAllClients();

  // Fetch subtasks (tasks with parent_task_id) separately since useTasks excludes them
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

  // Combine parent tasks and subtasks
  const combinedTasks = useMemo(() => [...allTasks, ...subtasks], [allTasks, subtasks]);
  
  // Get all task IDs to fetch assignees
  const taskIds = useMemo(() => combinedTasks.map((t: Task) => t.id), [combinedTasks]);
  const { data: assigneesMap = {}, isLoading: assigneesLoading } = useTasksAssignees(taskIds);
  const { data: subtaskCounts = {} } = useTasksSubtaskCounts(taskIds);

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskDialogOpen(true);
  };

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const memberTasks = useMemo(() => {
    if (!member) return { active: [] as Task[], completed: [] as Task[] };

    const { start, end } = getPeriodDates(period, customRange);
    
    const filteredTasks = combinedTasks.filter((task: Task) => {
      // Exclude onboarding tasks
      if (task.type === "onboarding") return false;
      
      // Check if member is assigned via legacy field OR via task_assignees table
      const isAssignedLegacy = task.assigned_to === member.id;
      const taskAssignees = assigneesMap[task.id] || [];
      const isAssignedNew = taskAssignees.some(a => a.team_member_id === member.id);
      
      if (!isAssignedLegacy && !isAssignedNew) return false;
      
      const taskDate = parseLocalDate(task.due_date);
      return taskDate >= start && taskDate <= end;
    });

    return {
      active: filteredTasks.filter((t: Task) => t.status !== "done"),
      completed: filteredTasks.filter((t: Task) => t.status === "done"),
    };
  }, [combinedTasks, member, period, customRange, assigneesMap]);
 
   const now = new Date();
 
   if (!member) return null;
 
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
                     memberTasks.active.map((task: Task, index: number) => {
                       const isOverdue = parseLocalDate(task.due_date) < now;
                       return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * index }}
                            onClick={() => handleTaskClick(task.parent_task_id || task.id)}
                            className={cn(
                              "rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md",
                              isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border hover:border-primary/30"
                            )}
                          >
                           <div className="flex items-start justify-between gap-4">
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                 <p className="font-medium text-foreground truncate">{task.title}</p>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    Peso: {task.weight + (subtaskCounts[task.id]?.weight || 0)}
                                  </Badge>
                               </div>
                               <p className="text-sm text-muted-foreground mt-1">
                                 {clientMap.get(task.client_id) || "—"}
                               </p>
                             </div>
                             <div className="flex flex-col items-end gap-2">
                               <Badge className={cn(statusConfig[task.status]?.color)}>
                                 {statusConfig[task.status]?.label}
                               </Badge>
                               <Badge variant="outline" className={cn("text-xs", typeConfig[task.type]?.color)}>
                                 {typeConfig[task.type]?.label}
                               </Badge>
                             </div>
                           </div>
                           <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                             <div className="flex items-center gap-1">
                               <Calendar className="h-3.5 w-3.5" />
                               <span>
                                  {format(parseLocalDate(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                                </span>
                             </div>
                             {isOverdue && (
                               <div className="flex items-center gap-1 text-destructive">
                                 <AlertTriangle className="h-3.5 w-3.5" />
                                 <span>Atrasada</span>
                               </div>
                             )}
                           </div>
                         </motion.div>
                       );
                     })
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
                     memberTasks.completed.map((task: Task, index: number) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.03 * index }}
                          onClick={() => handleTaskClick(task.id)}
                          className="rounded-lg border border-border p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                        >
                         <div className="flex items-start justify-between gap-4">
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <CheckCircle className="h-4 w-4 text-success shrink-0" />
                               <p className="font-medium text-foreground truncate">{task.title}</p>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  Peso: {task.weight + (subtaskCounts[task.id]?.weight || 0)}
                                </Badge>
                             </div>
                             <p className="text-sm text-muted-foreground mt-1 ml-6">
                               {clientMap.get(task.client_id) || "—"}
                             </p>
                           </div>
                           <Badge variant="outline" className={cn("text-xs", typeConfig[task.type]?.color)}>
                             {typeConfig[task.type]?.label}
                           </Badge>
                         </div>
                         <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground ml-6">
                           <div className="flex items-center gap-1">
                             <Calendar className="h-3.5 w-3.5" />
                             <span>
                               Entregue em {format(new Date(task.updated_at), "dd 'de' MMM", { locale: ptBR })}
                             </span>
                           </div>
                         </div>
                       </motion.div>
                     ))
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