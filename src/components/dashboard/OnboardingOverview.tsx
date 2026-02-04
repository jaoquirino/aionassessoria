import { motion } from "framer-motion";
import { ClipboardList, CheckCircle2, Clock, Play, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface OnboardingOverviewData {
  clientsInOnboarding: number;
  totalModulesOnboarding: number;
  completedModules: number;
  clientsWithProgress: Array<{
    clientId: string;
    clientName: string;
    totalModules: number;
    completedModules: number;
    progressPercent: number;
  }>;
}

const statusConfig = {
  not_started: { icon: Clock, color: "text-muted-foreground" },
  in_progress: { icon: Play, color: "text-blue-500" },
  waiting_client: { icon: AlertCircle, color: "text-amber-500" },
  completed: { icon: CheckCircle2, color: "text-green-500" },
};

export function OnboardingOverview() {
  const { data, isLoading } = useQuery<OnboardingOverviewData>({
    queryKey: ["onboarding_overview"],
    queryFn: async () => {
      // Fetch all module onboardings grouped by client
      const { data: onboardings, error } = await supabase
        .from("client_module_onboarding")
        .select(`
          id,
          client_id,
          status,
          clients(id, name)
        `);

      if (error) throw error;

      // Group by client
      const clientMap = new Map<string, {
        clientId: string;
        clientName: string;
        totalModules: number;
        completedModules: number;
      }>();

      for (const onboarding of onboardings || []) {
        const clientId = onboarding.client_id;
        const clientName = (onboarding as any).clients?.name || "Cliente";
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientId,
            clientName,
            totalModules: 0,
            completedModules: 0,
          });
        }

        const client = clientMap.get(clientId)!;
        client.totalModules++;
        if (onboarding.status === "completed") {
          client.completedModules++;
        }
      }

      const clientsWithProgress = Array.from(clientMap.values())
        .filter(c => c.totalModules > c.completedModules) // Only show clients with incomplete onboarding
        .map(c => ({
          ...c,
          progressPercent: Math.round((c.completedModules / c.totalModules) * 100),
        }))
        .sort((a, b) => b.progressPercent - a.progressPercent)
        .slice(0, 5); // Top 5 clients

      const totalModules = onboardings?.length || 0;
      const completedModules = onboardings?.filter(o => o.status === "completed").length || 0;

      return {
        clientsInOnboarding: clientsWithProgress.length,
        totalModulesOnboarding: totalModules,
        completedModules,
        clientsWithProgress,
      };
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.clientsInOnboarding === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card className="glass">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Clientes em Onboarding
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {data.clientsInOnboarding} cliente(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso Geral</span>
              <span>{data.completedModules}/{data.totalModulesOnboarding} módulos</span>
            </div>
            <Progress 
              value={data.totalModulesOnboarding > 0 
                ? (data.completedModules / data.totalModulesOnboarding) * 100 
                : 0
              } 
              className="h-2" 
            />
          </div>

          {/* Client list */}
          <div className="space-y-2">
            {data.clientsWithProgress.map((client) => (
              <div
                key={client.clientId}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{client.clientName}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={client.progressPercent} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {client.completedModules}/{client.totalModules}
                    </span>
                  </div>
                </div>
                <Badge 
                  variant={client.progressPercent === 100 ? "default" : "outline"}
                  className="shrink-0"
                >
                  {client.progressPercent}%
                </Badge>
              </div>
            ))}
          </div>

          {/* Link to onboarding templates */}
          <div className="pt-2 border-t">
            <Link to="/onboarding-templates">
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-primary">
                Gerenciar Modelos de Onboarding
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
