import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized realtime subscription that listens to all relevant tables
 * and invalidates the corresponding React Query caches.
 *
 * Optimizations vs previous version:
 *  - Debounced invalidation: batches rapid-fire events into a single flush
 *  - Reduced cascade: each table only invalidates its own query keys +
 *    the minimum set of dependent keys
 *  - Covers ALL tables in supabase_realtime publication
 */
export function useGlobalRealtime() {
  const queryClient = useQueryClient();

  // Debounce: collect keys, flush once per animation frame
  const pendingKeys = useRef<Set<string>>(new Set());
  const rafId = useRef<number | null>(null);

  const flush = useCallback(() => {
    const keys = Array.from(pendingKeys.current);
    pendingKeys.current.clear();
    rafId.current = null;
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }, [queryClient]);

  const enqueue = useCallback(
    (...keys: string[]) => {
      keys.forEach((k) => pendingKeys.current.add(k));
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(flush);
      }
    },
    [flush]
  );

  useEffect(() => {
    const channel = supabase
      .channel("global-realtime")
      // Tasks
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        enqueue("tasks", "task", "dashboard", "dashboard_onboarding_tasks", "deliveries", "all_team_members", "client_onboarding_progress", "onboarding_module_tasks");
      })
      // Task assignees
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, () => {
        enqueue("task_assignees", "tasks", "all_team_members", "dashboard");
      })
      // Task checklist
      .on("postgres_changes", { event: "*", schema: "public", table: "task_checklist" }, () => {
        enqueue("tasks", "task");
      })
      // Task comments
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" }, () => {
        enqueue("task_comments");
      })
      // Task attachments
      .on("postgres_changes", { event: "*", schema: "public", table: "task_attachments" }, () => {
        enqueue("task");
      })
      // Task history
      .on("postgres_changes", { event: "*", schema: "public", table: "task_history" }, () => {
        enqueue("task");
      })
      // Task priorities
      .on("postgres_changes", { event: "*", schema: "public", table: "task_priorities" }, () => {
        enqueue("task_priorities");
      })
      // Team members
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => {
        enqueue("all_team_members", "team_members", "current_team_member", "dashboard");
      })
      // Profiles
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        enqueue("task_comments", "current_team_member", "profile");
      })
      // Clients
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        enqueue("all_clients", "clients", "client", "dashboard");
      })
      // Contracts
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, () => {
        enqueue("client_contracts_full", "contracts", "dashboard", "financial_evolution", "all_clients");
      })
      // Contract modules
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_modules" }, () => {
        enqueue("client_contracts_full", "contracts", "all_service_modules");
      })
      // Service modules
      .on("postgres_changes", { event: "*", schema: "public", table: "service_modules" }, () => {
        enqueue("all_service_modules", "service_modules");
      })
      // Kanban columns
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_columns" }, () => {
        enqueue("kanban_columns");
      })
      // Client module onboarding
      .on("postgres_changes", { event: "*", schema: "public", table: "client_module_onboarding" }, () => {
        enqueue("client_module_onboarding", "client_onboarding_progress");
      })
      // Onboarding responses
      .on("postgres_changes", { event: "*", schema: "public", table: "client_onboarding_responses" }, () => {
        enqueue("onboarding_responses", "all_onboarding_responses", "client_onboarding_progress");
      })
      // Onboarding templates
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_templates" }, () => {
        enqueue("onboarding_templates", "onboarding_template");
      })
      // Onboarding template steps
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_template_steps" }, () => {
        enqueue("onboarding_templates", "onboarding_template_steps", "onboarding_template");
      })
      // User roles
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        enqueue("users_with_roles", "user_roles");
      })
      // Notifications
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        enqueue("notifications");
      })
      // Editorial posts
      .on("postgres_changes", { event: "*", schema: "public", table: "editorial_posts" }, () => {
        enqueue("editorial_posts");
      })
      // Editorial post attachments
      .on("postgres_changes", { event: "*", schema: "public", table: "editorial_post_attachments" }, () => {
        enqueue("editorial_posts");
      })
      // Module permissions
      .on("postgres_changes", { event: "*", schema: "public", table: "module_permissions" }, () => {
        enqueue("my_module_permissions", "user_module_permissions");
      })
      // Financial categories
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_categories" }, () => {
        enqueue("financial_categories");
      })
      // Financial transactions
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions" }, () => {
        enqueue("financial_transactions");
      })
      .subscribe();

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient, enqueue]);
}
