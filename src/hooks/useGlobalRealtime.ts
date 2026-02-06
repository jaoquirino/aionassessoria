import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized realtime subscription that listens to all relevant tables
 * and invalidates the corresponding React Query caches.
 * Mount once at the layout level.
 */
export function useGlobalRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("global-realtime")
      // Tasks
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["task"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard_onboarding_tasks"] });
        queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
        queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress"] });
        queryClient.invalidateQueries({ queryKey: ["onboarding_module_tasks"] });
      })
      // Task assignees
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, () => {
        queryClient.invalidateQueries({ queryKey: ["task_assignees"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      // Task checklist
      .on("postgres_changes", { event: "*", schema: "public", table: "task_checklist" }, () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["task"] });
      })
      // Task comments
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["task_comments"] });
      })
      // Task attachments
      .on("postgres_changes", { event: "*", schema: "public", table: "task_attachments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["task"] });
      })
      // Task history
      .on("postgres_changes", { event: "*", schema: "public", table: "task_history" }, () => {
        queryClient.invalidateQueries({ queryKey: ["task"] });
      })
      // Team members
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all_team_members"] });
        queryClient.invalidateQueries({ queryKey: ["team_members"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["task_assignees"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["current_team_member"] });
      })
      // Profiles
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        queryClient.invalidateQueries({ queryKey: ["task_comments"] });
        queryClient.invalidateQueries({ queryKey: ["current_team_member"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      })
      // Clients
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all_clients"] });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        queryClient.invalidateQueries({ queryKey: ["client"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      // Contracts
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["client_contracts_full"] });
        queryClient.invalidateQueries({ queryKey: ["contracts"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["financial_evolution"] });
        queryClient.invalidateQueries({ queryKey: ["all_clients"] });
      })
      // Contract modules
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_modules" }, () => {
        queryClient.invalidateQueries({ queryKey: ["client_contracts_full"] });
        queryClient.invalidateQueries({ queryKey: ["contracts"] });
        queryClient.invalidateQueries({ queryKey: ["all_service_modules"] });
      })
      // Service modules
      .on("postgres_changes", { event: "*", schema: "public", table: "service_modules" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all_service_modules"] });
        queryClient.invalidateQueries({ queryKey: ["service_modules"] });
      })
      // Kanban columns
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_columns" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kanban_columns"] });
      })
      // Client module onboarding
      .on("postgres_changes", { event: "*", schema: "public", table: "client_module_onboarding" }, () => {
        queryClient.invalidateQueries({ queryKey: ["client_module_onboarding"] });
        queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress"] });
      })
      // Onboarding responses
      .on("postgres_changes", { event: "*", schema: "public", table: "client_onboarding_responses" }, () => {
        queryClient.invalidateQueries({ queryKey: ["onboarding_responses"] });
        queryClient.invalidateQueries({ queryKey: ["all_onboarding_responses"] });
        queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress"] });
      })
      // Onboarding templates
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_templates" }, () => {
        queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
        queryClient.invalidateQueries({ queryKey: ["onboarding_template"] });
      })
      // Onboarding template steps
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_template_steps" }, () => {
        queryClient.invalidateQueries({ queryKey: ["onboarding_templates"] });
        queryClient.invalidateQueries({ queryKey: ["onboarding_template_steps"] });
        queryClient.invalidateQueries({ queryKey: ["onboarding_template"] });
      })
      // User roles
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
        queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
