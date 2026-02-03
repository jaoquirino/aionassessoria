import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
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
  Target,
  Package,
  Link as LinkIcon,
  StickyNote,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
} from "@/hooks/useTasks";
import { taskStatusConfig, taskTypeConfig, type TaskStatusDB } from "@/types/tasks";

interface TaskDetailSheetProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailSheet({ taskId, open, onOpenChange }: TaskDetailSheetProps) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: teamMembers = [] } = useTeamMembers();
  
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const addChecklistItem = useAddChecklistItem();
  const toggleChecklistItem = useToggleChecklistItem();
  const deleteChecklistItem = useDeleteChecklistItem();
  const addAttachment = useAddAttachment();
  const deleteAttachment = useDeleteAttachment();
  const addComment = useAddComment();

  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newComment, setNewComment] = useState("");

  if (!open) return null;

  const handleStatusChange = (newStatus: TaskStatusDB) => {
    if (!task) return;
    
    // Validate completion rules
    if (newStatus === "done") {
      const allChecklistCompleted = !task.checklist?.length || task.checklist.every(item => item.is_completed);
      const hasAttachment = task.attachments && task.attachments.length > 0;
      
      if (!allChecklistCompleted) {
        return; // Don't allow completion if checklist not done
      }
      if (!hasAttachment) {
        return; // Don't allow completion without attachment/link
      }
    }
    
    updateStatus.mutate({ taskId: task.id, status: newStatus });
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
  
  const canComplete = task && (
    (!task.checklist?.length || task.checklist.every(item => item.is_completed)) &&
    task.attachments && task.attachments.length > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : task ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
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
                  <SheetTitle className="text-lg">{task.title}</SheetTitle>
                </div>
              </div>

              {/* Status Selector */}
              <div className="mt-4">
                <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatusDB)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(taskStatusConfig) as [TaskStatusDB, typeof taskStatusConfig[TaskStatusDB]][]).map(([key, config]) => (
                      <SelectItem 
                        key={key} 
                        value={key}
                        disabled={key === "done" && !canComplete}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", config.color.replace("text-", "bg-"))} />
                          {config.label}
                          {key === "done" && !canComplete && (
                            <span className="text-xs text-muted-foreground ml-2">(checklist e anexo obrigatórios)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Completion Warning */}
              {task.status !== "done" && !canComplete && (
                <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                  <p className="font-medium text-warning">Para marcar como Entregue:</p>
                  <ul className="mt-1 text-muted-foreground text-xs space-y-1">
                    {task.checklist?.length && !task.checklist.every(i => i.is_completed) && (
                      <li>• Complete todos os itens do checklist</li>
                    )}
                    {(!task.attachments || task.attachments.length === 0) && (
                      <li>• Adicione pelo menos um anexo ou link de entrega</li>
                    )}
                  </ul>
                </div>
              )}
            </SheetHeader>

            <ScrollArea className="flex-1">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
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
                  <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <History className="h-4 w-4 mr-2" />
                    Histórico
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="p-6 space-y-6 mt-0">
                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Cliente
                      </p>
                      <p className="text-sm font-medium">{task.client?.name || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" /> Módulo
                      </p>
                      <p className="text-sm font-medium">
                        {task.contract_module?.service_module?.name || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Responsável
                      </p>
                      <Select
                        value={task.assigned_to || ""}
                        onValueChange={(v) => updateTask.mutate({ id: task.id, assigned_to: v || null })}
                      >
                        <SelectTrigger className="h-8 text-sm">
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
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Prazo
                      </p>
                      <p className={cn("text-sm font-medium", isOverdue && "text-destructive")}>
                        {format(new Date(task.due_date), "dd/MM/yyyy")}
                        {isOverdue && " (Atrasada)"}
                      </p>
                    </div>
                  </div>

                  {/* Deliverable Info */}
                  {task.contract_module?.deliverable_limit && (
                    <div className={cn(
                      "p-3 rounded-lg border",
                      task.contract_module.deliverable_used >= task.contract_module.deliverable_limit 
                        ? "border-destructive/50 bg-destructive/5" 
                        : "border-primary/30 bg-primary/5"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Entregáveis do Módulo</span>
                        <Badge variant={task.is_deliverable ? "default" : "outline"}>
                          {task.is_deliverable ? "Conta como entregável" : "Não conta"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              task.contract_module.deliverable_used >= task.contract_module.deliverable_limit 
                                ? "bg-destructive" 
                                : "bg-primary"
                            )}
                            style={{ 
                              width: `${Math.min(100, (task.contract_module.deliverable_used / task.contract_module.deliverable_limit) * 100)}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {task.contract_module.deliverable_used}/{task.contract_module.deliverable_limit}
                        </span>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Description Sections */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" /> Objetivo
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {task.description_objective || <span className="text-muted-foreground italic">Não definido</span>}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" /> O que deve ser entregue
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {task.description_deliverable || <span className="text-muted-foreground italic">Não definido</span>}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> Referências
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {task.description_references || <span className="text-muted-foreground italic">Não definido</span>}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <StickyNote className="h-3 w-3" /> Observações
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {task.description_notes || <span className="text-muted-foreground italic">Não definido</span>}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Required Role Display */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Função Exigida</p>
                    <Badge variant="secondary" className="text-sm">
                      {task.required_role}
                    </Badge>
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
                  {/* Add Attachment */}
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome do anexo"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL do link ou arquivo"
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      />
                      <Button variant="outline" onClick={handleAddAttachment}>
                        <Plus className="h-4 w-4" />
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
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            Tarefa não encontrada
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
