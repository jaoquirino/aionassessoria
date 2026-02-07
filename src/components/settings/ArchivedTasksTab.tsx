import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";
import { Archive, RotateCcw, Loader2, Search, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArchivedTasks, useUnarchiveTask, useDeleteTask } from "@/hooks/useTasks";
import { taskTypeConfig, priorityConfig, taskStatusConfig, type TaskType, type TaskPriority, type TaskStatusDB } from "@/types/tasks";
import { cn } from "@/lib/utils";

interface TaskPreview {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  due_date: string;
  client?: { name: string } | null;
  description_notes?: string | null;
  archived_at?: string | null;
}

export function ArchivedTasksTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [previewTask, setPreviewTask] = useState<TaskPreview | null>(null);
  
  const { data: archivedTasks = [], isLoading } = useArchivedTasks();
  const unarchiveTask = useUnarchiveTask();
  const deleteTask = useDeleteTask();

  const filteredTasks = archivedTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUnarchive = (taskId: string) => {
    unarchiveTask.mutate(taskId);
  };

  const handleDelete = async () => {
    if (deleteTaskId) {
      await deleteTask.mutateAsync(deleteTaskId);
      setDeleteTaskId(null);
    }
  };

  const handleDeleteAll = async () => {
    for (const task of filteredTasks) {
      await deleteTask.mutateAsync(task.id);
    }
    setDeleteAllConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Tarefas Arquivadas
              </CardTitle>
              <CardDescription>
                Tarefas removidas da visualização principal. Apenas administradores podem acessar.
              </CardDescription>
            </div>
            {filteredTasks.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAllConfirm(true)}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Todas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas arquivadas..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma tarefa arquivada encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task, index) => {
                const typeConfig = taskTypeConfig[task.type as TaskType];
                const prioConfig = priorityConfig[task.priority as TaskPriority] || priorityConfig.medium;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setPreviewTask(task as TaskPreview)}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">
                          {task.title}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", typeConfig?.color)}>
                          {typeConfig?.label || task.type}
                        </Badge>
                        <Badge className={cn("text-xs", prioConfig.color)}>
                          {prioConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{task.client?.name || "Sem cliente"}</span>
                        <span>•</span>
                        <span>
                          Arquivada em{" "}
                          {task.archived_at
                            ? format(new Date(task.archived_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewTask(task as TaskPreview)}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnarchive(task.id)}
                        disabled={unarchiveTask.isPending}
                        className="gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTaskId(task.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-2">
            Total: {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? "s" : ""} arquivada{filteredTasks.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Task Preview Dialog */}
      <Dialog open={!!previewTask} onOpenChange={() => setPreviewTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewTask?.title}</DialogTitle>
          </DialogHeader>
          {previewTask && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={cn("text-xs", taskTypeConfig[previewTask.type as TaskType]?.color)}>
                  {taskTypeConfig[previewTask.type as TaskType]?.label || previewTask.type}
                </Badge>
                <Badge className={cn("text-xs", priorityConfig[previewTask.priority as TaskPriority]?.color)}>
                  {priorityConfig[previewTask.priority as TaskPriority]?.label || previewTask.priority}
                </Badge>
                <Badge className={cn("text-xs", taskStatusConfig[previewTask.status as TaskStatusDB]?.color)}>
                  {taskStatusConfig[previewTask.status as TaskStatusDB]?.label || previewTask.status}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <span className="font-medium">{previewTask.client?.name || "Sem cliente"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prazo:</span>{" "}
                  <span className="font-medium">
                    {format(parseLocalDate(previewTask.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                {previewTask.archived_at && (
                  <div>
                    <span className="text-muted-foreground">Arquivada em:</span>{" "}
                    <span className="font-medium">
                      {format(new Date(previewTask.archived_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>

              {previewTask.description_notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{previewTask.description_notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleUnarchive(previewTask.id);
                    setPreviewTask(null);
                  }}
                  disabled={unarchiveTask.isPending}
                  className="gap-1 flex-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteTaskId(previewTask.id);
                    setPreviewTask(null);
                  }}
                  className="gap-1 flex-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirmation Dialog */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será removida permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todas as tarefas arquivadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? "s" : ""} será{filteredTasks.length !== 1 ? "ão" : ""} removida{filteredTasks.length !== 1 ? "s" : ""} permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
