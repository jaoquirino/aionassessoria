import { useState, useEffect, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
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
import { cn, parseLocalDate } from "@/lib/utils";
import {
  useTask,
  useUpdateTask,
  useUpdateTaskStatus,
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
import { taskStatusConfig, taskTypeConfig, type TaskStatusDB, type TaskType } from "@/types/tasks";
import { TaskComments } from "./TaskComments";
import { useTaskComments } from "@/hooks/useTaskComments";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
              default_weight
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
      }> = [];
      
      contracts?.forEach(contract => {
        contract.contract_modules?.forEach((cm: any) => {
          if (cm.service_module) {
            modules.push({
              contractModuleId: cm.id,
              moduleId: cm.module_id,
              moduleName: cm.service_module.name,
              primaryRole: cm.service_module.primary_role,
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
  const { data: task, isLoading } = useTask(taskId);
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: clients = [] } = useClients();
  const { data: comments = [] } = useTaskComments(taskId);
  
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
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
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [descriptionNotes, setDescriptionNotes] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [contractModuleId, setContractModuleId] = useState<string>("");

  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch modules for the selected client
  const { data: clientModules = [] } = useClientModules(clientId);

  // Sync form state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setAssignedTo(task.assigned_to || "");
      setDueDate(task.due_date ? parseLocalDate(task.due_date) : undefined);
      setDescriptionNotes(task.description_notes || "");
      setClientId(task.client_id || "");
      setContractModuleId(task.contract_module_id || "");
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;

    setIsSaving(true);
    try {
      // Find the contract_id from the selected module
      let contractId = task.contract_id;
      if (contractModuleId && contractModuleId !== task.contract_module_id) {
        const { data: cm } = await supabase
          .from("contract_modules")
          .select("contract_id")
          .eq("id", contractModuleId)
          .single();
        if (cm) contractId = cm.contract_id;
      }

      await updateTask.mutateAsync({
        id: task.id,
        title,
        status,
        assigned_to: assignedTo || null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : task.due_date,
        description_notes: descriptionNotes || null,
        contract_module_id: contractModuleId || null,
        contract_id: contractId,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setAssignedTo(task.assigned_to || "");
      setDueDate(task.due_date ? parseLocalDate(task.due_date) : undefined);
      setDescriptionNotes(task.description_notes || "");
      setClientId(task.client_id || "");
      setContractModuleId(task.contract_module_id || "");
    }
    onOpenChange(false);
  };

  // Auto-save on outside click
  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && task) {
      await handleSave();
    }
    onOpenChange(newOpen);
  };

  const handleAddChecklistItem = () => {
    if (!task || !newChecklistItem.trim()) return;
    addChecklistItem.mutate({ taskId: task.id, text: newChecklistItem.trim() });
    setNewChecklistItem("");
  };

  const handleAddAttachment = () => {
    if (!task || !newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
    addAttachment.mutate({
      taskId: task.id,
      fileName: newAttachmentName.trim(),
      fileUrl: newAttachmentUrl.trim(),
    });
    setNewAttachmentName("");
    setNewAttachmentUrl("");
  };

  const handleAddComment = () => {
    if (!task || !newComment.trim()) return;
    addComment.mutate({ taskId: task.id, comment: newComment.trim() });
    setNewComment("");
  };

  const isOverdue = task && new Date(task.due_date) < new Date() && task.status !== "done";
  const checklistProgress = task?.checklist?.length 
    ? task.checklist.filter(item => item.is_completed).length / task.checklist.length 
    : 0;
  
  // Task can always be completed - no requirements for checklist or notes
  const canComplete = task && (
    !task.checklist?.length || task.checklist.every(item => item.is_completed)
  );

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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : task ? (
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header - Inline editable title */}
            <div className="p-6 pb-4 border-b shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={cn("text-xs", taskTypeConfig[task.type].color)}>
                  {taskTypeConfig[task.type].label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Peso: {task.weight}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Atrasada
                  </Badge>
                )}
              </div>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Título da tarefa"
              />
            </div>

            <ScrollArea className="flex-1">
              <Tabs defaultValue={initialTab} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 sticky top-0 bg-background z-10">
                  <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <FileText className="h-4 w-4 mr-2" />
                    Detalhes
                  </TabsTrigger>
                  <TabsTrigger value="checklist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Checklist
                    {task.checklist?.length ? (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {task.checklist.filter(i => i.is_completed).length}/{task.checklist.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Anexos
                    {task.attachments?.length ? (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {task.attachments.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comentários
                    {comments.length > 0 ? (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {comments.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <History className="h-4 w-4 mr-2" />
                    Histórico
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="p-6 space-y-6 mt-0">
                  {/* Status with colors */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as TaskStatusDB)}>
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

                  {/* Completion Warning - only show if checklist is incomplete */}
                  {status !== "done" && task.checklist?.length > 0 && !task.checklist.every(i => i.is_completed) && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                      <p className="font-medium text-warning">Para marcar como Entregue:</p>
                      <ul className="mt-1 text-muted-foreground text-xs space-y-1">
                        <li>• Complete todos os itens do checklist</li>
                      </ul>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <User className="h-3 w-3" /> Responsável
                      </Label>
                      <Select value={assignedTo} onValueChange={setAssignedTo}>
                        <SelectTrigger>
                          <SelectValue placeholder="Não atribuído" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Prazo
                      </Label>
                      <Popover>
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
                            onSelect={setDueDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Client & Module Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Cliente
                      </Label>
                      <Select 
                        value={clientId} 
                        onValueChange={(val) => {
                          setClientId(val);
                          setContractModuleId(""); // Reset module when client changes
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
                        onValueChange={setContractModuleId}
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

                  {/* Priority Display */}
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select 
                      value={task.priority || "medium"} 
                      onValueChange={(val) => updateTask.mutate({ id: task.id, priority: val as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <Badge className="bg-success/20 text-success">Baixa</Badge>
                        </SelectItem>
                        <SelectItem value="medium">
                          <Badge className="bg-warning/20 text-warning">Média</Badge>
                        </SelectItem>
                        <SelectItem value="high">
                          <Badge className="bg-primary/20 text-primary">Alta</Badge>
                        </SelectItem>
                        <SelectItem value="urgent">
                          <Badge className="bg-destructive/20 text-destructive">Pra ontem</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Single Observations Field */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <StickyNote className="h-3 w-3" /> Observações
                    </Label>
                    <Textarea 
                      value={descriptionNotes}
                      onChange={(e) => setDescriptionNotes(e.target.value)}
                      placeholder="Notas adicionais, referências, objetivos e entregáveis"
                      className="resize-none min-h-[120px]"
                    />
                  </div>
                </TabsContent>

                {/* Checklist Tab */}
                <TabsContent value="checklist" className="p-6 space-y-4 mt-0">
                  {/* Progress Bar */}
                  {task.checklist && task.checklist.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{Math.round(checklistProgress * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all"
                          style={{ width: `${checklistProgress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Add Item */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova subetapa..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                    />
                    <Button variant="outline" onClick={handleAddChecklistItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    {task.checklist?.map((item) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          item.is_completed && "bg-success/5 border-success/30"
                        )}
                      >
                        <Checkbox
                          checked={item.is_completed}
                          onCheckedChange={(checked) => 
                            toggleChecklistItem.mutate({ 
                              itemId: item.id, 
                              isCompleted: !!checked, 
                              taskId: task.id 
                            })
                          }
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          item.is_completed && "line-through text-muted-foreground"
                        )}>
                          {item.item_text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteChecklistItem.mutate({ itemId: item.id, taskId: task.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {(!task.checklist || task.checklist.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma subetapa adicionada
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="p-6 space-y-4 mt-0">
                  {/* Add URL/Link */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> URL ou Link de Referência
                    </Label>
                    <Input
                      placeholder="Nome do link"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddAttachment()}
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleAddAttachment}
                        disabled={!newAttachmentName.trim() || !newAttachmentUrl.trim()}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-2">
                    {task.attachments?.map((attachment) => (
                      <div 
                        key={attachment.id} 
                        className="flex items-center gap-3 p-3 rounded-lg border"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                          <a 
                            href={attachment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Abrir <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteAttachment.mutate({ attachmentId: attachment.id, taskId: task.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {(!task.attachments || task.attachments.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum anexo adicionado
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="p-6 mt-0">
                  <TaskComments taskId={task.id} />
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
                    {task.history?.map((entry) => (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          {entry.action_type === "comment" ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : entry.action_type === "status_change" ? (
                            <Clock className="h-4 w-4" />
                          ) : entry.action_type === "assignee_change" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <History className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          {entry.action_type === "comment" ? (
                            <p className="text-foreground">{entry.comment}</p>
                          ) : entry.action_type === "status_change" ? (
                            <p className="text-muted-foreground">
                              Status alterado de{" "}
                              <span className="font-medium text-foreground">
                                {taskStatusConfig[entry.old_value as TaskStatusDB]?.label || entry.old_value}
                              </span>{" "}
                              para{" "}
                              <span className="font-medium text-foreground">
                                {taskStatusConfig[entry.new_value as TaskStatusDB]?.label || entry.new_value}
                              </span>
                            </p>
                          ) : entry.action_type === "assignee_change" ? (
                            <p className="text-muted-foreground">Responsável alterado</p>
                          ) : entry.action_type === "created" ? (
                            <p className="text-muted-foreground">Tarefa criada</p>
                          ) : (
                            <p className="text-muted-foreground">{entry.action_type}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(entry.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {(!task.history || task.history.length === 0) && (
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
                onClick={async () => { 
                  await archiveTask.mutateAsync(task.id); 
                  onOpenChange(false); 
                }}
                disabled={isSaving || archiveTask.isPending}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 mr-auto"
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={async () => { await handleSave(); onOpenChange(false); }} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
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
  );
}
