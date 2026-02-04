import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, RotateCcw, Loader2, Search, Trash2 } from "lucide-react";
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
import { useArchivedTasks, useUnarchiveTask, useDeleteTask } from "@/hooks/useTasks";
import { taskTypeConfig, priorityConfig, type TaskType, type TaskPriority } from "@/types/tasks";
import { cn } from "@/lib/utils";

export function ArchivedTasksTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  
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
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Tarefas Arquivadas
          </CardTitle>
          <CardDescription>
            Tarefas removidas da visualização principal. Apenas administradores podem acessar.
          </CardDescription>
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
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
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
                    <div className="flex items-center gap-2 shrink-0 ml-4">
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

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}
