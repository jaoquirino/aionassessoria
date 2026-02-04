import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, Play, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientOnboardingProgress } from "@/hooks/useClientModuleOnboarding";
import { cn } from "@/lib/utils";

interface ClientOnboardingProgressProps {
  clientId: string;
  showDetail?: boolean;
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

export function ClientOnboardingProgress({ clientId, showDetail = false }: ClientOnboardingProgressProps) {
  const { data: progress, isLoading } = useClientOnboardingProgress(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!progress || progress.totalModules === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Overall Progress */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Progresso do Onboarding</CardTitle>
            <Badge variant={progress.progressPercent === 100 ? "default" : "secondary"}>
              {progress.completedModules}/{progress.totalModules} módulos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso Geral</span>
              <span>{progress.progressPercent}%</span>
            </div>
            <Progress value={progress.progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Module Details */}
      {showDetail && (
        <div className="space-y-3">
          {progress.modules.map((module) => {
            const config = statusConfig[module.status as keyof typeof statusConfig] || statusConfig.not_started;
            const StatusIcon = config.icon;

            return (
              <Card key={module.moduleId} className="glass">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-full", config.bgColor)}>
                        <StatusIcon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                      <span className="font-medium text-sm">{module.moduleName}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  {module.totalTasks > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{module.completedTasks}/{module.totalTasks} tarefas</span>
                        <span>{module.progressPercent}%</span>
                      </div>
                      <Progress value={module.progressPercent} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
