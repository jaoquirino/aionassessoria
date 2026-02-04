import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ModuleUpdate {
  moduleId: string;
  deliverableLimit: number | null;
}

interface UpdateContractModulesInput {
  contractId: string;
  modules: ModuleUpdate[];
}

export function useUpdateContractModules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, modules }: UpdateContractModulesInput) => {
      // First, get existing contract modules
      const { data: existingModules, error: fetchError } = await supabase
        .from("contract_modules")
        .select("id, module_id")
        .eq("contract_id", contractId);

      if (fetchError) throw fetchError;

      const existingModuleIds = new Set(existingModules?.map(m => m.module_id) || []);
      const newModuleIds = new Set(modules.map(m => m.moduleId));

      // Determine modules to add, update, and remove
      const toAdd = modules.filter(m => !existingModuleIds.has(m.moduleId));
      const toUpdate = modules.filter(m => existingModuleIds.has(m.moduleId));
      const toRemove = existingModules?.filter(m => !newModuleIds.has(m.module_id)) || [];

      // Remove modules that are no longer selected
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("contract_modules")
          .delete()
          .in("id", toRemove.map(m => m.id));

        if (deleteError) throw deleteError;
      }

      // Add new modules
      if (toAdd.length > 0) {
        const insertData = toAdd.map(m => ({
          contract_id: contractId,
          module_id: m.moduleId,
          deliverable_limit: m.deliverableLimit,
        }));

        const { error: insertError } = await supabase
          .from("contract_modules")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Update existing modules (deliverable limits)
      for (const module of toUpdate) {
        const existingModule = existingModules?.find(m => m.module_id === module.moduleId);
        if (existingModule) {
          const { error: updateError } = await supabase
            .from("contract_modules")
            .update({ deliverable_limit: module.deliverableLimit })
            .eq("id", existingModule.id);

          if (updateError) throw updateError;
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_contracts_full"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar módulos: " + error.message);
    },
  });
}
