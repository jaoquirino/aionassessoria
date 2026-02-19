import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  User,
  Building2,
  FileText,
  CheckSquare,
  Paperclip,
  History,
  Plus,
  ExternalLink,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Package,
  StickyNote,
  CalendarIcon,
  Archive,
  Copy,
  
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { cn, parseLocalDate } from "@/lib/utils";
 import {
   useTask,
   useUpdateTask,
   useAddChecklistItem,
   useToggleChecklistItem,
   useDeleteChecklistItem,
   useAddAttachment,
   useDeleteAttachment,
   useAddComment,
   useTeamMembers,
   useClients,
   useArchiveTask,
 } from "@/hooks/useTasks";
 import { useSubtasks, useAddSubtask, useToggleSubtask, useDeleteSubtask, useUpdateSubtask } from "@/hooks/useSubtasks";
 import { useTaskAssignees, useSetTaskAssignees, useTasksAssignees } from "@/hooks/useTaskAssignees";
import { taskStatusConfig, taskTypeConfig, type TaskStatusDB, type TaskType, type TaskPriority } from "@/types/tasks";
import { usePriorities } from "@/hooks/usePriorities";
import { SubtaskRow } from "./SubtaskRow";
import { TaskComments } from "./TaskComments";
import { useTaskComments } from "@/hooks/useTaskComments";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { Task } from "@/types/tasks";
import { supabase } from "@/integrations/supabase/client";

interface TaskEditDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
}

// Hook to fetch modules for a specific client
function useClientModules(clientId: string | null) {
  return useQuery({
    queryKey: ["client_modules", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // Get active contracts for this client with their modules
      const { data: contracts } = await supabase
        .from("contracts")
        .select(`
          id,
          contract_modules (
            id,
            module_id,
            service_module:service_modules (
              id,
              name,
              primary_role,
              default_weight,
              is_recurring
            )
          )
        `)
        .eq("client_id", clientId)
        .eq("status", "active");

      // Flatten the modules
      const modules: Array<{
        contractModuleId: string;
        moduleId: string;
        moduleName: string;
        primaryRole: string;
        defaultWeight: number;
        isRecurring: boolean;
      }> = [];
      
      contracts?.forEach(contract => {
        contract.contract_modules?.forEach((cm: any) => {
          if (cm.service_module) {
            modules.push({
              contractModuleId: cm.id,
              moduleId: cm.module_id,
              moduleName: cm.service_module.name,
              primaryRole: cm.service_module.primary_role,
              defaultWeight: cm.service_module.default_weight,
              isRecurring: cm.service_module.is_recurring,
            });
          }
        });
      });

      return modules;
    },
    enabled: !!clientId,
  });
}

export function TaskEditDialog({ taskId, open, onOpenChange, initialTab = "details" }: TaskEditDialogProps) {
  const { data: task, isLoading: taskLoading } = useTask(taskId);
  // Pre-populate from tasks list cache for instant display
  const queryClient = useQueryClient();
  const cachedTask = useMemo(() => {
    if (!taskId) return null;
    const tasks = queryClient.getQueryData<Task[]>(["tasks"]);
    return tasks?.find(t => t.id === taskId) || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);
  const displayTask = task || cachedTask;
  const isLoading = !displayTask && taskLoading;
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: clients = [] } = useClients();
  const { data: comments = [] } = useTaskComments(taskId);
   const { data: taskAssigneesData = [] } = useTaskAssignees(taskId);
   const setTaskAssignees = useSetTaskAssignees();
  const { data: subtasks = [] } = useSubtasks(open ? taskId : null);
  const subtaskIds = useMemo(() => subtasks.map(s => s.id), [subtasks]);
  const { data: subtaskAssigneesMap = {} } = useTasksAssignees(subtaskIds);
  const addSubtask = useAddSubtask();
  const toggleSubtask = useToggleSubtask();
  const deleteSubtask = useDeleteSubtask();
  const { data: dbPriorities = [] } = usePriorities();
  const updateSubtask = useUpdateSubtask();
  const setSubtaskAssignees = useSetTaskAssignees();
  
  const updateTask = useUpdateTask();
  const addChecklistItem = useAddChecklistItem();
  const toggleChecklistItem = useToggleChecklistItem();
  const deleteChecklistItem = useDeleteChecklistItem();
  const addAttachment = useAddAttachment();
  const deleteAttachment = useDeleteAttachment();
  const addComment = useAddComment();
  const archiveTask = useArchiveTask();

  // Form state
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatusDB>("todo");
   const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [descriptionNotes, setDescriptionNotes] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [contractModuleId, setContractModuleId] = useState<string>("");
  const [taskType, setTaskType] = useState<TaskType>("recurring");
  const [weight, setWeight] = useState<number>(2);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deliverableType, setDeliverableType] = useState<string | null>(null);

  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);
  const loadedTaskIdRef = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fetch modules for the selected client
  const { data: clientModules = [] } = useClientModules(clientId);

  // Reset dirty flag when dialog opens with a new task
  useEffect(() => {
    if (open && taskId && taskId !== loadedTaskIdRef.current) {
      isDirtyRef.current = false;
      loadedTaskIdRef.current = taskId;
    }
    if (!open) {
      isDirtyRef.current = false;
      loadedTaskIdRef.current = null;
    }
  }, [open, taskId]);

  // Sync form state when task loads initially (skip if user has local changes)
  const displayTaskId = displayTask?.id;
  const syncedTaskIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !displayTask || isDirtyRef.current) return;
    // Only sync once per task open
    if (syncedTaskIdRef.current === displayTaskId) return;
    syncedTaskIdRef.current = displayTaskId || null;
    setTitle(displayTask.title);
    setStatus(displayTask.status);
    setPriority(displayTask.priority || "medium");
    setDueDate(displayTask.due_date ? parseLocalDate(displayTask.due_date) : undefined);
    setDescriptionNotes(displayTask.description_notes || "");
    setClientId(displayTask.client_id || "");
    setContractModuleId(displayTask.contract_module_id || "");
    setTaskType(displayTask.type);
    setWeight(displayTask.weight);
    setDeliverableType(displayTask.deliverable_type || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTaskId, open]);

  // Reset synced ref when dialog closes
  useEffect(() => {
    if (!open) {
      syncedTaskIdRef.current = null;
    }
  }, [open]);

  // Mark form as dirty when any field changes
  const markDirty = () => { isDirtyRef.current = true; };
 
   // Sync assignees when data loads
   const assigneesKey = taskAssigneesData.map(a => a.team_member_id).join(",");
   const syncedAssigneesRef = useRef<string>("");
   useEffect(() => {
     if (!isDirtyRef.current && assigneesKey !== syncedAssigneesRef.current) {
       syncedAssigneesRef.current = assigneesKey;
       setSelectedAssignees(taskAssigneesData.map(a => a.team_member_id));
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [assigneesKey]);

  // Handler para mudar módulo e atualizar tipo/peso automaticamente
  const handleModuleChange = (newModuleId: string) => {
    markDirty();
    setContractModuleId(newModuleId);
    const selectedModule = clientModules.find(m => m.contractModuleId === newModuleId);
    if (selectedModule) {
      setWeight(selectedModule.defaultWeight);
      setTaskType(selectedModule.isRecurring ? "recurring" : "extra");
    }
  };

  const handleSave = async () => {
    if (!displayTask) return;

    setIsSaving(true);
    try {
      const clientChanged = clientId && clientId !== displayTask.client_id;

      // Find the contract_id from the selected module
      let contractId = displayTask.contract_id;
      if (contractModuleId && contractModuleId !== displayTask.contract_module_id) {
        const { data: cm } = await supabase
          .from("contract_modules")
          .select("contract_id")
          .eq("id", contractModuleId)
          .single();
        if (cm) contractId = cm.contract_id;
      }

      // If client changed and no module selected yet, detach contract
      if (clientChanged && !contractModuleId) {
        contractId = null;
      }

      await updateTask.mutateAsync({
        id: displayTask.id,
        title,
        status,
        priority,
        client_id: clientId,
         assigned_to: selectedAssignees[0] || null,
        due_date: dueDate ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}` : displayTask.due_date,
        description_notes: descriptionNotes || null,
        contract_module_id: contractModuleId || null,
        type: taskType,
        deliverable_type: deliverableType,
      } as any);

       // Save multiple assignees
       await setTaskAssignees.mutateAsync({ taskId: displayTask.id, memberIds: selectedAssignees });
      isDirtyRef.current = false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (displayTask) {
      setTitle(displayTask.title);
      setStatus(displayTask.status);
      setPriority(displayTask.priority || "medium");
       setSelectedAssignees(taskAssigneesData.map(a => a.team_member_id));
      setDueDate(displayTask.due_date ? parseLocalDate(displayTask.due_date) : undefined);
      setDescriptionNotes(displayTask.description_notes || "");
      setClientId(displayTask.client_id || "");
      setContractModuleId(displayTask.contract_module_id || "");
    }
    onOpenChange(false);
  };

  // Auto-save on outside click - close immediately, save in background
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && displayTask && isDirtyRef.current) {
      // Fire and forget - close immediately
      handleSave();
    }
    onOpenChange(newOpen);
  };

  const handleAddChecklistItem = () => {
    if (!displayTask || !newChecklistItem.trim()) return;
    addChecklistItem.mutate({ taskId: displayTask.id, text: newChecklistItem.trim() });
    setNewChecklistItem("");
  };

  const handleAddSubtask = () => {
    if (!displayTask || !newSubtaskTitle.trim()) return;
    addSubtask.mutate({ parentTask: displayTask, title: newSubtaskTitle.trim() });
    setNewSubtaskTitle("");
  };

  const handleAddAttachment = () => {
    if (!displayTask || !newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
    let url = newAttachmentUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    addAttachment.mutate({
      taskId: displayTask.id,
      fileName: newAttachmentName.trim(),
      fileUrl: url,
    });
    setNewAttachmentName("");
    setNewAttachmentUrl("");
  };

  const handleAddComment = () => {
    if (!displayTask || !newComment.trim()) return;
    addComment.mutate({ taskId: displayTask.id, comment: newComment.trim() });
    setNewComment("");
  };

  // Status color mapping
  const getStatusColor = (statusKey: string) => {
    const colors: Record<string, string> = {
      overdue: "bg-destructive text-destructive-foreground",
      todo: "bg-muted text-muted-foreground",
      in_progress: "bg-primary text-primary-foreground",
      review: "bg-warning text-warning-foreground",
      waiting_client: "bg-info text-info-foreground",
      done: "bg-success text-success-foreground",
    };
    return colors[statusKey] || "bg-muted text-muted-foreground";
  };

  const isSubtask = !!displayTask?.parent_task_id;

  if (!open) return null;
  const isOverdue = displayTask ? parseLocalDate(displayTask.due_date) < new Date() && displayTask.status !== "done" : false;
  const subtaskProgress = subtasks.length 
    ? subtasks.filter(s => s.status === "done").length / subtasks.length 
    : 0;
  const checklistProgress = displayTask?.checklist?.length 
    ? displayTask.checklist.filter(item => item.is_completed).length / displayTask.checklist.length 
    : 0;
  const canComplete = displayTask && (
    !displayTask.checklist?.length || displayTask.checklist.every(item => item.is_completed)
  );

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === "textarea" || tagName === "input") return;
      e.preventDefault();
      handleSave();
      onOpenChange(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={cn(
          "max-h-[90vh] p-0 overflow-hidden w-[calc(100%-2rem)] sm:w-full",
          isSubtask ? "max-w-lg" : "max-w-2xl"
        )}
        onKeyDown={handleDialogKeyDown}
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : displayTask ? (
          <div className="flex flex-col h-full max-h-[90vh]">
             {/* Header - Inline editable title */}
             <div className={cn("p-6 pb-4 border-b shrink-0", isSubtask && "border-l-4 border-l-primary")}>
               {isSubtask && (
                 <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                   <CheckSquare className="h-3 w-3" /> Subtarefa
                 </p>
               )}
               <div className="flex items-center gap-2 mb-3">
                 <Badge variant="outline" className={cn("text-xs", taskTypeConfig[taskType].color)}>
                   {taskTypeConfig[taskType].label}
                 </Badge>
                  <Badge variant="outline" className="text-xs">
                    Peso: {weight + subtasks.filter(s => s.status !== "done").reduce((sum, s) => sum + s.weight, 0)}
                  </Badge>
                 {isOverdue && (
                   <Badge variant="destructive" className="text-xs gap-1">
                     <AlertTriangle className="h-3 w-3" />
                     Atrasada
                   </Badge>
                 )}
               </div>
               <Input 
                 ref={titleInputRef}
                 value={title} 
                 onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                 className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                 placeholder="Título da tarefa"
                 autoFocus
               />
             </div>

            <ScrollArea className="flex-1 overflow-hidden">
              <Tabs defaultValue={initialTab} className="w-full overflow-hidden">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 px-4 sticky top-0 bg-background z-10 overflow-x-auto flex-nowrap">
                  <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <FileText className="h-4 w-4 mr-2" />
                    Detalhes
                  </TabsTrigger>
                  {!isSubtask && (
                    <>
                      <TabsTrigger value="checklist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Subtarefas
                        {subtasks.length > 0 ? (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {subtasks.filter(s => s.status === "done").length}/{subtasks.length}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                      <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Anexos
                        {displayTask.attachments?.length ? (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {displayTask.attachments.length}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                    </>
                  )}
                  <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comentários
                    {comments.length > 0 ? (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {comments.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  {!isSubtask && (
                    <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="p-6 space-y-6 mt-0">
                  {/* Status + Priority side by side - hide for subtasks */}
                  {!isSubtask && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={(v) => { setStatus(v as TaskStatusDB); markDirty(); }}>
                        <SelectTrigger>
                          <SelectValue>
                            <Badge className={getStatusColor(status)}>
                              {taskStatusConfig[status]?.label || status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(taskStatusConfig) as [string, typeof taskStatusConfig[keyof typeof taskStatusConfig]][])
                            .filter(([key]) => key !== "overdue")
                            .map(([key, config]) => (
                            <SelectItem 
                              key={key} 
                              value={key}
                              disabled={key === "done" && !canComplete}
                            >
                              <Badge className={getStatusColor(key)}>
                                {config.label}
                              </Badge>
                              {key === "done" && !canComplete && (
                                <span className="text-xs text-muted-foreground ml-2">(complete o checklist)</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={priority} onValueChange={(v) => { setPriority(v as TaskPriority); markDirty(); }}>
                        <SelectTrigger>
                          {(() => {
                            const current = dbPriorities.find(p => p.key === priority);
                            if (current) {
                              return (
                                <Badge
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${current.color}40`,
                                    color: current.color,
                                    borderColor: `${current.color}60`,
                                  }}
                                >
                                  {current.label}
                                </Badge>
                              );
                            }
                            return <SelectValue />;
                          })()}
                        </SelectTrigger>
                        <SelectContent>
                          {dbPriorities.length > 0 ? dbPriorities.map(p => (
                            <SelectItem key={p.key} value={p.key}>
                              <Badge
                                className="text-xs"
                                style={{
                                  backgroundColor: `${p.color}40`,
                                  color: p.color,
                                  borderColor: `${p.color}60`,
                                }}
                              >
                                {p.label}
                              </Badge>
                            </SelectItem>
                          )) : (
                            <>
                              <SelectItem value="urgent">🔴 Urgente</SelectItem>
                              <SelectItem value="high">🟠 Alta</SelectItem>
                              <SelectItem value="medium">🟡 Média</SelectItem>
                              <SelectItem value="low">🟢 Baixa</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  )}

                  {/* Completion Warning - hide for subtasks */}
                  {!isSubtask && status !== "done" && displayTask.checklist?.length > 0 && !displayTask.checklist.every(i => i.is_completed) && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                      <p className="font-medium text-warning">Para marcar como Entregue:</p>
                      <ul className="mt-1 text-muted-foreground text-xs space-y-1">
                        <li>• Complete todos os itens do checklist</li>
                      </ul>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className={cn("grid gap-4", isSubtask ? "grid-cols-1" : "grid-cols-2")}>
                    {!isSubtask && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                         <User className="h-3 w-3" /> Responsáveis
                      </Label>
                       <div className="space-y-2">
                         {teamMembers.map((member) => {
                           const isSelected = selectedAssignees.includes(member.id);
                           return (
                             <div key={member.id} className="flex items-center space-x-2">
                               <Checkbox
                                 id={`assignee-${member.id}`}
                                 checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    markDirty();
                                    if (checked) {
                                      setSelectedAssignees([...selectedAssignees, member.id]);
                                    } else {
                                      setSelectedAssignees(selectedAssignees.filter(id => id !== member.id));
                                    }
                                 }}
                               />
                               <label
                                 htmlFor={`assignee-${member.id}`}
                                 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                               >
                                 {member.avatar_url ? (
                                   <img src={member.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                                 ) : (
                                   <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                                     <span className="text-[10px] font-medium text-primary">
                                       {member.name.charAt(0).toUpperCase()}
                                     </span>
                                   </div>
                                 )}
                                 {member.name}
                               </label>
                             </div>
                           );
                         })}
                         {teamMembers.length === 0 && (
                           <p className="text-sm text-muted-foreground">Nenhum membro disponível</p>
                         )}
                       </div>
                    </div>
                    )}

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Prazo
                      </Label>
                      <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dueDate && "text-muted-foreground",
                              isOverdue && "border-destructive text-destructive"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={(d) => { setDueDate(d); markDirty(); setDueDateOpen(false); }}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Client & Module Selection - hide for subtasks */}
                  {!isSubtask && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Cliente
                      </Label>
                      <Select 
                        value={clientId} 
                        onValueChange={(val) => {
                          setClientId(val);
                          setContractModuleId("");
                          markDirty();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> Módulo
                      </Label>
                      <Select 
                        value={contractModuleId} 
                        onValueChange={handleModuleChange}
                        disabled={!clientId || clientModules.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !clientId ? "Selecione um cliente primeiro" :
                            clientModules.length === 0 ? "Nenhum módulo disponível" :
                            "Selecione um módulo"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {clientModules.map((module) => (
                            <SelectItem key={module.contractModuleId} value={module.contractModuleId}>
                              {module.moduleName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  )}


                  {/* Deliverable Type for subtasks */}
                  {isSubtask && (
                    <div className="space-y-4">
                      {/* Only show deliverable type if parent module is design */}
                      {(() => {
                        const selectedModule = clientModules.find(m => m.contractModuleId === contractModuleId);
                        const isDesignModule = selectedModule?.moduleName?.toLowerCase().includes("design");
                        if (!isDesignModule) return null;
                        return (
                          <div className="space-y-2">
                            <Label>Tipo de Entregável</Label>
                            <Select 
                              value={deliverableType || "none"} 
                              onValueChange={(val) => { setDeliverableType(val === "none" ? null : val); markDirty(); }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Nenhum" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                <SelectItem value="arte">🎨 Arte</SelectItem>
                                <SelectItem value="video">🎬 Vídeo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                   {/* Deliverable Type - only for design modules (parent tasks) */}
                  {!isSubtask && (() => {
                    const selectedModule = clientModules.find(m => m.contractModuleId === contractModuleId);
                    const isDesignModule = selectedModule?.moduleName?.toLowerCase().includes("design");
                    if (!isDesignModule) return null;
                    return (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> Tipo de Entregável
                        </Label>
                        <Select 
                          value={deliverableType || ""} 
                          onValueChange={(val) => { setDeliverableType(val || null); markDirty(); }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="arte">🎨 Arte</SelectItem>
                            <SelectItem value="video">🎬 Vídeo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

                  <Separator />

                  {/* Single Observations Field with @ mentions */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <StickyNote className="h-3 w-3" /> Observações
                      <span className="text-xs text-muted-foreground ml-2">(use @ para mencionar alguém)</span>
                    </Label>
                    <MentionTextarea 
                      value={descriptionNotes}
                      onValueChange={(val) => { setDescriptionNotes(val); markDirty(); }}
                      placeholder="Notas adicionais, referências, objetivos e entregáveis. Use @ para mencionar alguém."
                      className="resize-none min-h-[120px]"
                    />
                  </div>
                </TabsContent>

                {/* Subtasks Tab */}
                <TabsContent value="checklist" className="p-6 space-y-4 mt-0">
                  {/* Progress Bar */}
                  {subtasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{Math.round(subtaskProgress * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all"
                          style={{ width: `${subtaskProgress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Add Subtask */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova subtarefa..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    />
                    <Button variant="outline" onClick={handleAddSubtask}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Subtask Items */}
                  <div className="space-y-2">
                    {subtasks.map((sub) => (
                      <SubtaskRow
                        key={sub.id}
                        sub={sub}
                        parentId={displayTask.id}
                        teamMembers={teamMembers}
                        clientModules={clientModules}
                        assignees={subtaskAssigneesMap[sub.id] || []}
                        onToggle={(subtaskId, parentTaskId, isDone) => toggleSubtask.mutate({ subtaskId, parentTaskId, isDone })}
                        onUpdate={(subtaskId, parentTaskId, updates) => updateSubtask.mutate({ subtaskId, parentTaskId, updates })}
                        onSetAssignees={(taskId, memberIds) => setSubtaskAssignees.mutate({ taskId, memberIds })}
                        onEdit={(subtaskId) => setEditingSubtaskId(subtaskId)}
                        onDelete={(subtaskId, parentTaskId) => deleteSubtask.mutate({ subtaskId, parentTaskId })}
                      />
                    ))}

                    {subtasks.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma subtarefa adicionada
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Attachments Tab - Simplified */}
                <TabsContent value="attachments" className="p-4 sm:p-6 space-y-4 mt-0">
                  {/* Add URL/Link */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Adicionar Link de Referência
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      <Input
                        placeholder="Nome do link (ex: Briefing, Referência, Drive)"
                        value={newAttachmentName}
                        onChange={(e) => setNewAttachmentName(e.target.value)}
                      />
                      <Input
                        placeholder="https://..."
                        value={newAttachmentUrl}
                        onChange={(e) => {
                          let val = e.target.value;
                          setNewAttachmentUrl(val);
                        }}
                        onBlur={() => {
                          let val = newAttachmentUrl.trim();
                          if (val && !val.startsWith("http://") && !val.startsWith("https://")) {
                            setNewAttachmentUrl("https://" + val);
                          }
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleAddAttachment()}
                      />
                      <Button 
                        onClick={handleAddAttachment}
                        disabled={!newAttachmentName.trim() || !newAttachmentUrl.trim()}
                        className="w-full"
                      >
                        Adicionar Link
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Attachments List */}
                  <div className="space-y-2">
                    {displayTask.attachments?.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group cursor-pointer"
                      >
                        <a
                          href={attachment.file_url.startsWith("http") ? attachment.file_url : `https://${attachment.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 flex-1 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate text-primary underline-offset-2 hover:underline">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{attachment.file_url}</p>
                          </div>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title="Copiar link"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = attachment.file_url.startsWith("http") 
                              ? attachment.file_url 
                              : `https://${attachment.file_url}`;
                            navigator.clipboard.writeText(url);
                            import("sonner").then(({ toast }) => toast.success("Link copiado!"));
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteAttachment.mutate({ attachmentId: attachment.id, taskId: displayTask.id }); 
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {(!displayTask.attachments || displayTask.attachments.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum link adicionado
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="p-6 mt-0">
                  <TaskComments taskId={displayTask.id} />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="p-6 space-y-4 mt-0">
                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Adicionar comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                    <Button variant="outline" className="shrink-0" onClick={handleAddComment}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* History List */}
                  <div className="space-y-3">
                    {displayTask.history?.map((entry) => {
                      const priorityLabels: Record<string, string> = {
                        low: "Baixa",
                        medium: "Média",
                        high: "Alta",
                        urgent: "Pra ontem",
                      };

                      // Get color based on action type
                      const getHistoryColor = () => {
                        switch (entry.action_type) {
                          case "status_change":
                          case "status_changed":
                            return {
                              border: "border-primary",
                              bg: "bg-primary/10",
                              icon: "text-primary",
                            };
                          case "priority_changed":
                            return {
                              border: "border-warning",
                              bg: "bg-warning/10",
                              icon: "text-warning",
                            };
                          case "assignee_change":
                          case "assignee_changed":
                            return {
                              border: "border-info",
                              bg: "bg-info/10",
                              icon: "text-info",
                            };
                          case "created":
                            return {
                              border: "border-success",
                              bg: "bg-success/10",
                              icon: "text-success",
                            };
                          case "archived":
                            return {
                              border: "border-destructive",
                              bg: "bg-destructive/10",
                              icon: "text-destructive",
                            };
                          case "unarchived":
                            return {
                              border: "border-success",
                              bg: "bg-success/10",
                              icon: "text-success",
                            };
                          case "due_date_changed":
                            return {
                              border: "border-orange-500",
                              bg: "bg-orange-500/10",
                              icon: "text-orange-500",
                            };
                          case "title_changed":
                          case "notes_changed":
                          case "objective_changed":
                            return {
                              border: "border-purple-500",
                              bg: "bg-purple-500/10",
                              icon: "text-purple-500",
                            };
                          case "type_changed":
                          case "module_changed":
                          case "client_changed":
                          case "contract_changed":
                            return {
                              border: "border-cyan-500",
                              bg: "bg-cyan-500/10",
                              icon: "text-cyan-500",
                            };
                          case "comment":
                            return {
                              border: "border-muted-foreground",
                              bg: "bg-muted",
                              icon: "text-muted-foreground",
                            };
                          default:
                            return {
                              border: "border-muted",
                              bg: "bg-muted",
                              icon: "text-muted-foreground",
                            };
                        }
                      };

                      const getHistoryMessage = () => {
                        switch (entry.action_type) {
                          case "comment":
                            return <span className="text-foreground">{entry.comment}</span>;
                          case "status_change":
                          case "status_changed":
                            return (
                              <>
                                Status alterado de{" "}
                                <span className="font-medium text-foreground">
                                  {taskStatusConfig[entry.old_value as TaskStatusDB]?.label || entry.old_value}
                                </span>{" "}
                                para{" "}
                                <span className="font-medium text-foreground">
                                  {taskStatusConfig[entry.new_value as TaskStatusDB]?.label || entry.new_value}
                                </span>
                              </>
                            );
                          case "priority_changed":
                            return (
                              <>
                                Prioridade alterada de{" "}
                                <span className="font-medium text-foreground">
                                  {priorityLabels[entry.old_value || ""] || entry.old_value}
                                </span>{" "}
                                para{" "}
                                <span className="font-medium text-foreground">
                                  {priorityLabels[entry.new_value || ""] || entry.new_value}
                                </span>
                              </>
                            );
                          case "assignee_change":
                          case "assignee_changed":
                            return "Responsável alterado";
                          case "title_changed":
                            return (
                              <>
                                Título alterado de{" "}
                                <span className="font-medium text-foreground">"{entry.old_value}"</span>{" "}
                                para{" "}
                                <span className="font-medium text-foreground">"{entry.new_value}"</span>
                              </>
                            );
                          case "due_date_changed":
                            return (
                              <>
                                Prazo alterado de{" "}
                                <span className="font-medium text-foreground">{entry.old_value}</span>{" "}
                                para{" "}
                                <span className="font-medium text-foreground">{entry.new_value}</span>
                              </>
                            );
                          case "type_changed":
                            const typeLabels: Record<string, string> = {
                              recurring: "Recorrente",
                              planning: "Planejamento",
                              project: "Projeto",
                              extra: "Extra",
                            };
                            return (
                              <>
                                Tipo alterado de{" "}
                                <span className="font-medium text-foreground">{typeLabels[entry.old_value || ""] || entry.old_value}</span>{" "}
                                para{" "}
                                <span className="font-medium text-foreground">{typeLabels[entry.new_value || ""] || entry.new_value}</span>
                              </>
                            );
                          case "module_changed":
                            return "Módulo alterado";
                          case "client_changed":
                            return "Cliente alterado";
                          case "contract_changed":
                            return "Contrato alterado";
                          case "notes_changed":
                            return "Observações atualizadas";
                          case "objective_changed":
                            return "Objetivo atualizado";
                          case "field_change":
                            const fieldLabels: Record<string, string> = {
                              title: "Título",
                              priority: "Prioridade",
                              due_date: "Data de entrega",
                              client_id: "Cliente",
                              contract_module_id: "Módulo",
                              type: "Tipo",
                              required_role: "Função exigida",
                              description_notes: "Observações",
                            };
                            return `${fieldLabels[entry.comment || ""] || entry.comment} alterado`;
                          case "created":
                            return "Tarefa criada";
                          case "archived":
                            return "Tarefa arquivada";
                          case "unarchived":
                            return "Tarefa restaurada";
                          default:
                            return entry.action_type.replace(/_/g, " ");
                        }
                      };

                      const getIcon = () => {
                        switch (entry.action_type) {
                          case "comment":
                            return <MessageSquare className="h-4 w-4" />;
                          case "status_change":
                          case "status_changed":
                            return <Clock className="h-4 w-4" />;
                          case "assignee_change":
                          case "assignee_changed":
                            return <User className="h-4 w-4" />;
                          default:
                            return <History className="h-4 w-4" />;
                        }
                      };

                      const colors = getHistoryColor();

                      return (
                        <div key={entry.id} className={cn("flex gap-3 text-sm border-l-2 pl-3", colors.border)}>
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", colors.bg)}>
                            <span className={colors.icon}>{getIcon()}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-muted-foreground">{getHistoryMessage()}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {(!displayTask.history || displayTask.history.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum histórico
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {/* Footer */}
            <DialogFooter className="p-4 border-t shrink-0 flex-wrap gap-2">
              <Button 
                variant="ghost" 
                onClick={() => { 
                  archiveTask.mutate(displayTask.id); 
                  onOpenChange(false); 
                }}
                disabled={isSaving || archiveTask.isPending}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 mr-auto"
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={() => { handleSave(); onOpenChange(false); }}>
                Salvar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            Tarefa não encontrada
          </div>
        )}
      </DialogContent>
    </Dialog>

      {/* Nested dialog for editing a subtask */}
      {editingSubtaskId && (
        <TaskEditDialog
          taskId={editingSubtaskId}
          open={!!editingSubtaskId}
          onOpenChange={(open) => { if (!open) setEditingSubtaskId(null); }}
        />
      )}
    </>
  );
}
