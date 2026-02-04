import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OnboardingTemplateStep {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  responsible_role: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTemplate {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  steps?: OnboardingTemplateStep[];
  service_module?: {
    id: string;
    name: string;
    primary_role: string;
  };
}

// Fetch all templates with steps and module info
export function useOnboardingTemplates() {
  return useQuery({
    queryKey: ["onboarding_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .select(`
          *,
          steps:onboarding_template_steps(
            id, template_id, title, description, responsible_role, order_index, created_at, updated_at
          ),
          service_module:service_modules(id, name, primary_role)
        `)
        .order("name");

      if (error) throw error;
      
      // Sort steps by order_index
      return (data as OnboardingTemplate[]).map(template => ({
        ...template,
        steps: template.steps?.sort((a, b) => a.order_index - b.order_index) || [],
      }));
    },
  });
}

// Fetch steps by template ID
export function useOnboardingTemplateSteps(templateId: string | null) {
  return useQuery({
    queryKey: ["onboarding_template_steps", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("onboarding_template_steps")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index");

      if (error) throw error;
      return data as OnboardingTemplateStep[];
    },
    enabled: !!templateId,
  });
}

// Fetch template by module ID
export function useOnboardingTemplateByModule(moduleId: string | null) {
  return useQuery({
    queryKey: ["onboarding_template", moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      
      const { data, error } = await supabase
        .from("onboarding_templates")
        .select(`
          *,
          steps:onboarding_template_steps(
            id, template_id, title, description, responsible_role, order_index
          )
        `)
        .eq("module_id", moduleId)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.steps) {
        data.steps = data.steps.sort((a: OnboardingTemplateStep, b: OnboardingTemplateStep) => a.order_index - b.order_index);
      }
      
      return data as OnboardingTemplate | null;
    },
    enabled: !!moduleId,
  });
}

// Create template
export function useCreateOnboardingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { module_id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
      toast.success("Modelo de onboarding criado");
    },
    onError: (error) => {
      toast.error("Erro ao criar modelo: " + error.message);
    },
  });
}

// Update template
export function useUpdateOnboardingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { id, ...data } = input;
      const { error } = await supabase
        .from("onboarding_templates")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
      toast.success("Modelo atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar modelo: " + error.message);
    },
  });
}

// Delete template
export function useDeleteOnboardingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("onboarding_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
      toast.success("Modelo excluído");
    },
    onError: (error) => {
      toast.error("Erro ao excluir modelo: " + error.message);
    },
  });
}

// Create step
export function useCreateTemplateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      template_id: string; 
      title: string; 
      description?: string; 
      responsible_role: string;
      order_index: number;
    }) => {
      const { data, error } = await supabase
        .from("onboarding_template_steps")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
      toast.success("Etapa adicionada");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar etapa: " + error.message);
    },
  });
}

// Update step
export function useUpdateTemplateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      id: string; 
      title?: string; 
      description?: string; 
      responsible_role?: string;
      order_index?: number;
    }) => {
      const { id, ...data } = input;
      const { error } = await supabase
        .from("onboarding_template_steps")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar etapa: " + error.message);
    },
  });
}

// Delete step
export function useDeleteTemplateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("onboarding_template_steps")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
      toast.success("Etapa excluída");
    },
    onError: (error) => {
      toast.error("Erro ao excluir etapa: " + error.message);
    },
  });
}

// Reorder steps
export function useReorderTemplateSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (steps: { id: string; order_index: number }[]) => {
      // Update each step's order
      const updates = steps.map(step => 
        supabase
          .from("onboarding_template_steps")
          .update({ order_index: step.order_index })
          .eq("id", step.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
    },
    onError: (error) => {
      toast.error("Erro ao reordenar etapas: " + error.message);
    },
  });
}
