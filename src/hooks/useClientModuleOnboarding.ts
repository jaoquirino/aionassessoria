import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientModuleOnboarding {
  id: string;
  client_id: string;
  contract_id: string;
  contract_module_id: string;
  template_id: string | null;
  status: "not_started" | "in_progress" | "waiting_client" | "completed";
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Related data
  contract_module?: {
    id: string;
    module_id: string;
    service_module: {
      id: string;
      name: string;
      primary_role: string;
    };
  };
  template?: {
    id: string;
    name: string;
    steps: Array<{
      id: string;
      title: string;
      description: string | null;
      responsible_role: string;
      order_index: number;
    }>;
  };
}

export interface ClientOnboardingProgress {
  clientId: string;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  modules: Array<{
    moduleId: string;
    moduleName: string;
    status: string;
    totalTasks: number;
    completedTasks: number;
    progressPercent: number;
    contractModuleId: string;
    templateId: string | null;
    onboardingId: string;
  }>;
}

// Fetch client module onboardings with related data
export function useClientModuleOnboardings(clientId: string | null) {
  return useQuery({
    queryKey: ["client_module_onboarding", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("client_module_onboarding")
        .select(`
          *,
          contract_module:contract_modules(
            id,
            module_id,
            service_module:service_modules(id, name, primary_role)
          ),
          template:onboarding_templates(
            id,
            name,
            steps:onboarding_template_steps(id, title, description, responsible_role, order_index)
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ClientModuleOnboarding[];
    },
    enabled: !!clientId,
  });
}

// Calculate onboarding progress for a client
export function useClientOnboardingProgress(clientId: string | null) {
  return useQuery({
    queryKey: ["client_onboarding_progress", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      // Get all module onboardings for this client
      const { data: onboardings, error: onboardingError } = await supabase
        .from("client_module_onboarding")
        .select(`
          id,
          status,
          template_id,
          contract_module_id,
          contract_module:contract_modules(
            id,
            module_id,
            service_module:service_modules(id, name)
          )
        `)
        .eq("client_id", clientId);

      if (onboardingError) throw onboardingError;

      // Get onboarding tasks for this client
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, status, contract_module_id, type")
        .eq("client_id", clientId)
        .eq("type", "onboarding")
        .not("contract_module_id", "is", null);

      if (tasksError) throw tasksError;

      const modules = (onboardings || []).map((onboarding: any) => {
        const moduleTasks = (tasks || []).filter(t => t.contract_module_id === onboarding.contract_module?.id);
        const completedTasks = moduleTasks.filter(t => t.status === "done").length;
        
        return {
          moduleId: onboarding.contract_module?.module_id || "",
          moduleName: onboarding.contract_module?.service_module?.name || "Módulo",
          status: onboarding.status,
          totalTasks: moduleTasks.length,
          completedTasks,
          progressPercent: moduleTasks.length > 0 ? Math.round((completedTasks / moduleTasks.length) * 100) : 0,
          contractModuleId: onboarding.contract_module_id,
          templateId: onboarding.template_id,
          onboardingId: onboarding.id,
        };
      });

      const completedModules = modules.filter(m => m.status === "completed").length;

      return {
        clientId,
        totalModules: modules.length,
        completedModules,
        progressPercent: modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0,
        modules,
      } as ClientOnboardingProgress;
    },
    enabled: !!clientId,
  });
}

// Generate onboarding for modules when contract is saved
export function useGenerateModuleOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      clientId: string;
      contractId: string;
      contractModuleIds: Array<{ contractModuleId: string; moduleId: string }>;
    }) => {
      const { clientId, contractId, contractModuleIds } = input;
      
      // First, get templates for each module
      const { data: templates, error: templatesError } = await supabase
        .from("onboarding_templates")
        .select(`
          id,
          module_id,
          name,
          steps:onboarding_template_steps(id, title, description, responsible_role, order_index)
        `)
        .eq("is_active", true);

      if (templatesError) throw templatesError;

      // Create onboarding records for each module
      const onboardingInserts = contractModuleIds.map(item => {
        const template = templates?.find(t => t.module_id === item.moduleId);
        return {
          client_id: clientId,
          contract_id: contractId,
          contract_module_id: item.contractModuleId,
          template_id: template?.id || null,
          status: "not_started" as const,
        };
      });

      // Check for existing onboardings to avoid duplicates
      const { data: existing } = await supabase
        .from("client_module_onboarding")
        .select("contract_module_id")
        .in("contract_module_id", contractModuleIds.map(c => c.contractModuleId));

      const existingIds = new Set((existing || []).map(e => e.contract_module_id));
      const newInserts = onboardingInserts.filter(o => !existingIds.has(o.contract_module_id));

      if (newInserts.length > 0) {
        const { data: createdOnboardings, error: insertError } = await supabase
          .from("client_module_onboarding")
          .insert(newInserts)
          .select();

        if (insertError) throw insertError;

        // Now create tasks for each onboarding step
        const tasksToCreate: any[] = [];
        
        for (const onboarding of createdOnboardings || []) {
          const template = templates?.find(t => t.id === onboarding.template_id);
          if (!template?.steps) continue;

          for (const step of template.steps) {
            tasksToCreate.push({
              client_id: clientId,
              contract_id: contractId,
              contract_module_id: onboarding.contract_module_id,
              title: step.title,
              description_objective: step.description,
              type: "onboarding",
              required_role: step.responsible_role,
              priority: "high",
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 7 days from now
              status: "todo",
            });
          }
        }

        if (tasksToCreate.length > 0) {
          const { error: tasksError } = await supabase
            .from("tasks")
            .insert(tasksToCreate);

          if (tasksError) throw tasksError;
        }

        return { created: newInserts.length, tasksCreated: tasksToCreate.length };
      }

      return { created: 0, tasksCreated: 0 };
    },
    onSuccess: (result) => {
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ["client_module_onboarding"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        toast.success(`Onboarding gerado: ${result.created} módulo(s), ${result.tasksCreated} tarefa(s)`);
      }
    },
    onError: (error) => {
      toast.error("Erro ao gerar onboarding: " + error.message);
    },
  });
}

// Update onboarding status
export function useUpdateModuleOnboardingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      id: string; 
      status: "not_started" | "in_progress" | "waiting_client" | "completed";
    }) => {
      const updateData: any = { status: input.status };
      
      if (input.status === "in_progress" && !updateData.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      if (input.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("client_module_onboarding")
        .update(updateData)
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_module_onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });
}
