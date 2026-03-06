import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryItem {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  status: string;
  dueDate: string;
  completedAt: string | null;
  moduleName: string | null;
  weight: number;
  deliverableType: string | null;
  type: string;
}

export interface FinancialComparison {
  month: number;
  monthName: string;
  currentYearContracts: number;
  previousYearContracts: number;
  currentYearRevenue: number;
  previousYearRevenue: number;
}

export function useDeliveriesByClient(clientId?: string) {
  return useQuery({
    queryKey: ["deliveries", clientId],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          due_date,
          weight,
          is_deliverable,
          deliverable_type,
          client_id,
          archived_at,
          type,
          parent_task_id,
          clients(name),
          contract_module_id,
          contract_modules(
            service_module:service_modules(name)
          )
        `)
        .is("archived_at", null)
        .not("type", "eq", "onboarding")
        .order("due_date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const allTasks = data || [];

      // Identify parent tasks that have subtasks in the result set
      const parentIdsWithSubtasks = new Set(
        allTasks
          .filter((t: any) => t.parent_task_id)
          .map((t: any) => t.parent_task_id)
      );

      // Exclude parent tasks that have subtasks — subtasks replace them
      const filtered = allTasks.filter(
        (t: any) => !parentIdsWithSubtasks.has(t.id)
      );

      return filtered.map((task: any) => ({
        id: task.id,
        title: task.title,
        clientId: task.client_id,
        clientName: task.clients?.name || "Cliente",
        status: task.status,
        dueDate: task.due_date,
        completedAt: task.status === "done" ? task.due_date : null,
        moduleName: task.contract_modules?.service_module?.name || null,
        weight: task.weight,
        deliverableType: (task as any).deliverable_type || null,
      })) as DeliveryItem[];
    },
  });
}

export function useFinancialEvolution() {
  return useQuery({
    queryKey: ["financial_evolution"],
    queryFn: async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const previousYear = currentYear - 1;

      // Get all contracts with renewal_date to determine end dates
      const { data: contracts, error } = await supabase
        .from("contracts")
        .select("id, start_date, monthly_value, status, renewal_date, minimum_duration_months, created_at");

      if (error) throw error;

      // Process contracts by month for both years
      const monthlyData: FinancialComparison[] = [];
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

      // Helper function to check if contract is active in a given month
      const isContractActiveInMonth = (contract: any, year: number, month: number) => {
        const startDate = new Date(contract.start_date);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        // Contract hasn't started yet in this month
        if (startDate > monthEnd) return false;
        
        // Calculate contract end date based on start_date + minimum_duration_months
        // OR use renewal_date if it represents the actual end
        let contractEndDate: Date | null = null;
        
        if (contract.renewal_date) {
          contractEndDate = new Date(contract.renewal_date);
        }
        
        // If contract has an end date and the month is after it, contract is not active
        if (contractEndDate && monthStart > contractEndDate) {
          return false;
        }
        
        // If contract status is "ended", use the renewal_date as the end
        if (contract.status === "ended" && contractEndDate && monthStart > contractEndDate) {
          return false;
        }
        
        return true;
      };

      for (let month = 0; month < 12; month++) {
        // Filter contracts active in each month
        const currentYearContracts = contracts?.filter(c => isContractActiveInMonth(c, currentYear, month)) || [];
        const previousYearContracts = contracts?.filter(c => {
          const startDate = new Date(c.start_date);
          // Only include if started before or in previous year
          if (startDate.getFullYear() > previousYear) return false;
          return isContractActiveInMonth(c, previousYear, month);
        }) || [];

        // Calculate revenue
        const currentRevenue = currentYearContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
        const previousRevenue = previousYearContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);

        monthlyData.push({
          month: month + 1,
          monthName: monthNames[month],
          currentYearContracts: currentYearContracts.length,
          previousYearContracts: previousYearContracts.length,
          currentYearRevenue: currentRevenue,
          previousYearRevenue: previousRevenue,
        });
      }

      return {
        currentYear,
        previousYear,
        data: monthlyData,
        totals: {
          currentYearTotalRevenue: monthlyData.reduce((sum, m) => sum + m.currentYearRevenue, 0),
          previousYearTotalRevenue: monthlyData.reduce((sum, m) => sum + m.previousYearRevenue, 0),
          currentYearAvgContracts: Math.round(monthlyData.reduce((sum, m) => sum + m.currentYearContracts, 0) / 12),
          previousYearAvgContracts: Math.round(monthlyData.reduce((sum, m) => sum + m.previousYearContracts, 0) / 12),
        },
      };
    },
  });
}
