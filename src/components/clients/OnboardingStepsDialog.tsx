import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, Pencil, X, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTaskField, useUpdateTaskStatus } from "@/hooks/useTasks";

interface OnboardingStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contractModuleId: string;
  moduleName: string;
  isCompleted?: boolean;
}

type OnboardingTask = {
  id: string;
  title: string;
  description_objective: string | null;
  description_notes: string | null;
  status: "todo" | "in_progress" | "review" | "waiting_client" | "done";
  created_at: string;
};

export function OnboardingStepsDialog({
  open,
  onOpenChange,
  clientId,
  contractModuleId,
  moduleName,
  isCompleted = false,
}: OnboardingStepsDialogProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const updateTaskField = useUpdateTaskField();
  const updateTaskStatus = useUpdateTaskStatus();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["onboarding_module_tasks", clientId, contractModuleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, description_objective, description_notes, created_at")
        .eq("client_id", clientId)
        .eq("contract_module_id", contractModuleId)
        .eq("type", "project")
        .is("archived_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as OnboardingTask[];
    },
    enabled: open && !!clientId && !!contractModuleId,
  });

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleToggleStatus = async (taskId: string, current: OnboardingTask["status"]) => {
    const next = current === "done" ? "todo" : "done";
    await updateTaskStatus.mutateAsync({ taskId, status: next });
  };

  const handleStartEditing = (task: OnboardingTask) => {
    setEditingTaskId(task.id);
    setEditingNotes(task.description_notes || "");
  };

  const handleCancelEditing = () => {
    setEditingTaskId(null);
    setEditingNotes("");
  };

  const handleSaveNotes = async (taskId: string, currentStatus: OnboardingTask["status"]) => {
    // Save notes
    await updateTaskField.mutateAsync({
      taskId,
      field: "description_notes",
      value: editingNotes,
    });
    
    // Auto-complete task if notes were saved and task is not done
    if (editingNotes.trim() && currentStatus !== "done") {
      await updateTaskStatus.mutateAsync({ taskId, status: "done" });
      toast.success("Observações salvas e etapa concluída");
    } else {
      toast.success("Observações salvas");
    }
    
    setEditingTaskId(null);
    setEditingNotes("");
  };

  const isSaving = updateTaskField.isPending || updateTaskStatus.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {moduleName} - Onboarding
            {isCompleted && (
              <Badge className="bg-success/20 text-success border-success/30">
                Concluído
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{completedCount}/{tasks.length} etapas</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            <div className="space-y-3 py-2">
              {tasks.map((task, index) => {
                const isExpanded = expandedTaskIds.has(task.id);
                const stepIsCompleted = task.status === "done";
                const isEditing = editingTaskId === task.id;

                return (
                  <div key={task.id}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleTask(task.id)}>
                      <div
                        className={cn(
                          "border rounded-lg transition-colors",
                          stepIsCompleted ? "bg-success/5 border-success/20" : "bg-muted/30"
                        )}
                      >
                        <CollapsibleTrigger className="w-full p-4 flex items-start gap-3 text-left">
                          <button
                            type="button"
                            className={cn(
                              "mt-0.5 flex-shrink-0",
                              stepIsCompleted ? "text-success" : "text-muted-foreground"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleStatus(task.id, task.status);
                            }}
                            aria-label={stepIsCompleted ? "Reabrir tarefa" : "Concluir tarefa"}
                          >
                            {stepIsCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Etapa {index + 1}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {stepIsCompleted ? "Concluída" : "Pendente"}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-foreground mt-1">{task.title}</h4>
                            {task.description_objective && !isExpanded && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {task.description_objective}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-4">
                            {task.description_objective && (
                              <p className="text-sm text-muted-foreground pl-8">
                                {task.description_objective}
                              </p>
                            )}

                            <div className="pl-8 space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Resposta / Informações</Label>
                                  {!isEditing && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditing(task);
                                      }}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Pencil className="h-3.5 w-3.5 mr-1" />
                                      Editar
                                    </Button>
                                  )}
                                </div>

                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingNotes}
                                      onChange={(e) => setEditingNotes(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      placeholder="Digite as informações coletadas nesta etapa..."
                                      rows={4}
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-2 justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelEditing();
                                        }}
                                        disabled={isSaving}
                                        className="h-8"
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancelar
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSaveNotes(task.id, task.status);
                                        }}
                                        disabled={isSaving}
                                        className="h-8"
                                      >
                                        <Save className="h-4 w-4 mr-1" />
                                        Salvar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    className={cn(
                                      "min-h-[60px] p-3 rounded-md border bg-background text-sm",
                                      !task.description_notes && "text-muted-foreground italic"
                                    )}
                                  >
                                    {task.description_notes || "Nenhuma informação registrada. Clique em Editar para adicionar."}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}