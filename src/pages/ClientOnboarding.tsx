import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  Play,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useClientModuleOnboardings,
  useUpdateModuleOnboardingStatus,
  type ClientModuleOnboarding,
} from "@/hooks/useClientModuleOnboarding";

interface Client {
  id: string;
  name: string;
  status: string;
}

const statusConfig = {
  not_started: {
    label: "Não iniciado",
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  in_progress: {
    label: "Em andamento",
    icon: Play,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  waiting_client: {
    label: "Aguardando cliente",
    icon: AlertCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
};

export default function ClientOnboarding() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Fetch client
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!clientId,
  });

  // Fetch module onboardings
  const { data: onboardings = [], isLoading: onboardingsLoading } = useClientModuleOnboardings(clientId || null);

  // Fetch related tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["onboarding_tasks", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("client_id", clientId)
        .eq("type", "project")
        .is("archived_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Toggle task status
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
    
    if (error) {
      toast.error("Erro ao atualizar tarefa");
    } else {
      refetchTasks();
      // Also invalidate onboarding progress queries
      queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress", clientId] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_overview"] });
      toast.success(newStatus === "done" ? "Tarefa concluída!" : "Tarefa reaberta");
    }
  };

  const updateStatus = useUpdateModuleOnboardingStatus();

  const isLoading = clientLoading || onboardingsLoading;

  // Calculate progress
  const completedModules = onboardings.filter((o) => o.status === "completed").length;
  const totalModules = onboardings.length;
  const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  // Set initial active module
  if (!activeModuleId && onboardings.length > 0) {
    const firstIncomplete = onboardings.find((o) => o.status !== "completed");
    setActiveModuleId(firstIncomplete?.id || onboardings[0].id);
  }

  const activeOnboarding = onboardings.find((o) => o.id === activeModuleId);
  const moduleTasks = tasks.filter(
    (t) => t.contract_module_id === activeOnboarding?.contract_module_id
  );

  const handleStartModule = async (onboarding: ClientModuleOnboarding) => {
    if (onboarding.status === "not_started") {
      await updateStatus.mutateAsync({ id: onboarding.id, status: "in_progress" });
    }
    setActiveModuleId(onboarding.id);
  };

  const handleCompleteModule = async () => {
    if (!activeOnboarding) return;

    await updateStatus.mutateAsync({ id: activeOnboarding.id, status: "completed" });

    // Check if all modules are completed
    const allCompleted = onboardings.every(
      (o) => o.id === activeOnboarding.id || o.status === "completed"
    );

    if (allCompleted) {
      // Activate client
      await supabase
        .from("clients")
        .update({ status: "active" })
        .eq("id", clientId);

      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Onboarding finalizado! Cliente ativado.");
      navigate("/clientes");
    } else {
      // Move to next module
      const nextModule = onboardings.find(
        (o) => o.id !== activeOnboarding.id && o.status !== "completed"
      );
      if (nextModule) {
        setActiveModuleId(nextModule.id);
      }
      toast.success("Módulo concluído!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar
        </Button>
        <div className="text-center text-muted-foreground">Cliente não encontrado</div>
      </div>
    );
  }

  // Show empty state when no module onboardings exist
  if (onboardings.length === 0) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Onboarding: {client.name}
            </h1>
            <p className="text-muted-foreground">Configuração do cliente</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-8 text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Nenhum módulo de onboarding encontrado
              </h2>
              <p className="text-muted-foreground mt-1">
                Para gerar o onboarding, edite o contrato do cliente e ative a opção "Gerar
                Onboarding" ao salvar.
              </p>
            </div>
            <Button onClick={() => navigate("/clientes")} className="mt-4">
              Voltar para Clientes
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Onboarding: {client.name}
            </h1>
            <p className="text-muted-foreground">
              {completedModules} de {totalModules} módulos concluídos
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="w-fit bg-primary/10 text-primary border-primary/30"
        >
          {Math.round(progress)}% completo
        </Badge>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-4"
      >
        <Progress value={progress} className="h-2" />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Modules Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4"
        >
          <h2 className="font-semibold text-foreground mb-4">Módulos</h2>
          <div className="space-y-2">
            {onboardings.map((onboarding) => {
              const config =
                statusConfig[onboarding.status as keyof typeof statusConfig] ||
                statusConfig.not_started;
              const StatusIcon = config.icon;
              const moduleName =
                onboarding.contract_module?.service_module?.name || "Módulo";

              return (
                <button
                  key={onboarding.id}
                  onClick={() => handleStartModule(onboarding)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-all",
                    activeModuleId === onboarding.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50",
                    onboarding.status === "completed" && "opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      config.bgColor
                    )}
                  >
                    <StatusIcon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        onboarding.status === "completed"
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                    >
                      {moduleName}
                    </p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Module Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <AnimatePresence mode="wait">
            {activeOnboarding && (
              <motion.div
                key={activeOnboarding.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {activeOnboarding.contract_module?.service_module?.name || "Módulo"}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {activeOnboarding.template?.name || "Onboarding do módulo"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      statusConfig[
                        activeOnboarding.status as keyof typeof statusConfig
                      ]?.bgColor,
                      statusConfig[
                        activeOnboarding.status as keyof typeof statusConfig
                      ]?.color
                    )}
                  >
                    {
                      statusConfig[
                        activeOnboarding.status as keyof typeof statusConfig
                      ]?.label
                    }
                  </Badge>
                </div>

                {/* Tasks for this module */}
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">
                    Tarefas ({moduleTasks.length})
                  </h3>
                  {moduleTasks.length > 0 ? (
                    <div className="space-y-2">
                      {moduleTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                            task.status === "done"
                              ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
                              : "bg-muted/30 border-border hover:bg-muted/50"
                          )}
                        >
                          {task.status === "done" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium truncate",
                                task.status === "done" && "line-through text-muted-foreground"
                              )}
                            >
                              {task.title}
                            </p>
                            {task.description_objective && (
                              <p className="text-xs text-muted-foreground truncate">
                                {task.description_objective}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {task.status === "done" ? "Concluída" : "Pendente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma tarefa cadastrada para este módulo.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/tarefas?client=${clientId}`)}
                  >
                    Ver Tarefas
                  </Button>
                  {activeOnboarding.status !== "completed" && (
                    <Button onClick={handleCompleteModule} className="gap-2">
                      Concluir Módulo
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
