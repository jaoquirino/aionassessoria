import { motion } from "framer-motion";
import { Clock, MoreHorizontal, FileText, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClientWithContracts } from "@/hooks/useClients";

interface OnboardingClientCardProps {
  client: ClientWithContracts;
  index: number;
  onContinue: (clientId: string) => void;
  onEditContract: (client: ClientWithContracts) => void;
  onCancel: (clientId: string) => void;
}

const statusConfig = {
  onboarding: { label: "Em Onboarding", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Clock },
};

export function OnboardingClientCard({
  client,
  index,
  onContinue,
  onEditContract,
  onCancel,
}: OnboardingClientCardProps) {
  // Fetch onboarding progress for this client
  const { data: progress } = useQuery({
    queryKey: ["onboarding_progress_simple", client.id],
    queryFn: async () => {
      // Get tasks for this client's onboarding
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, status")
        .eq("client_id", client.id)
        .eq("type", "onboarding")
        .is("archived_at", null);

      if (error) throw error;

      const total = tasks?.length || 0;
      const completed = tasks?.filter(t => t.status === "done").length || 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, percent };
    },
    staleTime: 30000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.05 * index }}
      className="glass rounded-xl p-4 border-blue-500/30 bg-blue-500/5"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-foreground truncate flex-1 mr-2">{client.name}</span>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={cn(statusConfig.onboarding.color, "text-xs whitespace-nowrap")}>
            {statusConfig.onboarding.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border z-50">
              <DropdownMenuItem onClick={() => onEditContract(client)}>
                <FileText className="h-4 w-4 mr-2" />
                Editar Contrato
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onCancel(client.id)}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Onboarding
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress bar */}
      {progress && progress.total > 0 && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.completed}/{progress.total} tarefas</span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-1.5" />
        </div>
      )}

      <Button
        size="sm"
        className="w-full whitespace-nowrap"
        onClick={() => onContinue(client.id)}
      >
        Continuar Onboarding
      </Button>
    </motion.div>
  );
}
