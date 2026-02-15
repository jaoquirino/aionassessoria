 import { motion } from "framer-motion";
 import { useNavigate } from "react-router-dom";
 import { ClipboardList, Clock, AlertTriangle, ArrowRight } from "lucide-react";
 import { Badge } from "@/components/ui/badge";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { cn, parseLocalDate } from "@/lib/utils";
 
 interface OnboardingTask {
   id: string;
   title: string;
   clientName: string;
   assigneeName: string;
   assigneeAvatar: string | null;
   dueDate: string;
   status: string;
   isOverdue: boolean;
   weight: number;
 }
 
 const statusConfig: Record<string, { label: string; color: string }> = {
   todo: { label: "A fazer", color: "bg-muted text-muted-foreground" },
   in_progress: { label: "Em produção", color: "bg-primary/20 text-primary" },
   review: { label: "Revisão", color: "bg-warning/20 text-warning" },
   waiting_client: { label: "Aguardando", color: "bg-info/20 text-info" },
   done: { label: "Entregue", color: "bg-success/20 text-success" },
 };
 
 export function OnboardingTasksSection() {
   const navigate = useNavigate();
 
   const { data: tasks = [], isLoading } = useQuery({
     queryKey: ["dashboard_onboarding_tasks"],
     queryFn: async () => {
       const now = new Date();
 
       // Fetch onboarding tasks (type = 'onboarding')
        // Only show onboarding-type tasks
        const { data: tasksData, error } = await supabase
          .from("tasks")
          .select("*, client:clients(name)")
          .eq("type", "onboarding")
          .is("archived_at", null)
          .neq("status", "done")
          .order("due_date", { ascending: true })
          .limit(5);
 
       // Fetch team members for names
       const { data: teamMembers } = await supabase
         .from("team_members_public")
         .select("*");
 
       const membersMap = new Map(teamMembers?.map(m => [m.id, m]) || []);
 
        return (tasksData || []).map(task => ({
          id: task.id,
          title: task.title,
          clientName: task.client?.name || "—",
          assigneeName: task.assigned_to ? (membersMap.get(task.assigned_to)?.name || "Não atribuído") : "Não atribuído",
          assigneeAvatar: task.assigned_to ? (membersMap.get(task.assigned_to)?.avatar_url || null) : null,
          dueDate: task.due_date,
          status: task.status,
          isOverdue: parseLocalDate(task.due_date) < now && task.status !== "done",
          weight: task.weight,
        })) as OnboardingTask[];
     },
     staleTime: 30000,
   });
 
   if (isLoading || tasks.length === 0) {
     return null;
   }
 
   const overdueCount = tasks.filter(t => t.isOverdue).length;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: 0.35 }}
       className="glass rounded-xl p-6"
     >
       <div className="mb-6 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
             <ClipboardList className="h-5 w-5 text-primary" />
           </div>
           <div>
             <h3 className="text-lg font-semibold text-foreground">Tarefas de Onboarding</h3>
             <p className="text-sm text-muted-foreground">
               {overdueCount > 0 && <span className="text-destructive">{overdueCount} atrasada(s) · </span>}
               {tasks.length} em andamento
             </p>
           </div>
         </div>
         <button
           onClick={() => navigate("/tarefas?filter=onboarding")}
           className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
         >
           Ver todas
           <ArrowRight className="h-4 w-4" />
         </button>
       </div>
 
       <div className="space-y-3">
         {tasks.map((task, index) => (
           <motion.div
             key={task.id}
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 * index }}
             className={cn(
               "group flex items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted/50 cursor-pointer",
               task.isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border"
             )}
              onClick={() => navigate(`/tarefas?task=${task.id}`)}
            >
             <div
               className={cn(
                 "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                 task.isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
               )}
             >
               {task.isOverdue ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
             </div>
 
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2">
                 <p className="font-medium text-foreground truncate">{task.title}</p>
                 <Badge variant="outline" className="shrink-0 text-xs">Peso: {task.weight}</Badge>
               </div>
               <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                 <span>{task.clientName}</span>
                 <span>·</span>
                 <div className="flex items-center gap-1">
                   {task.assigneeAvatar && (
                     <Avatar className="h-4 w-4">
                       <AvatarImage src={task.assigneeAvatar} />
                       <AvatarFallback className="text-[8px]">
                         {task.assigneeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                       </AvatarFallback>
                     </Avatar>
                   )}
                   <span>{task.assigneeName}</span>
                 </div>
               </div>
             </div>
 
             <div className="flex items-center gap-3">
               <Badge className={cn("shrink-0", statusConfig[task.status]?.color || "bg-muted")}>
                 {statusConfig[task.status]?.label || task.status}
               </Badge>
               {task.isOverdue && (
                 <span className="text-xs font-medium text-destructive">Atrasada</span>
               )}
             </div>
           </motion.div>
         ))}
       </div>
     </motion.div>
   );
 }