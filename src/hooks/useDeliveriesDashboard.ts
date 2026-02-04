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
          client_id,
          clients(name),
          contract_module_id,
          contract_modules(
            service_module:service_modules(name)
          )
        `)
        .eq("is_deliverable", true)
        .order("due_date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        clientId: task.client_id,
        clientName: task.clients?.name || "Cliente",
        status: task.status,
        dueDate: task.due_date,
        completedAt: task.status === "done" ? task.due_date : null,
        moduleName: task.contract_modules?.service_module?.name || null,
        weight: task.weight,
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

      // Get all contracts
      const { data: contracts, error } = await supabase
        .from("contracts")
        .select("id, start_date, monthly_value, status, created_at");

      if (error) throw error;

      // Process contracts by month for both years
      const monthlyData: FinancialComparison[] = [];
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

      for (let month = 0; month < 12; month++) {
        const currentYearEnd = new Date(currentYear, month + 1, 0);
        const previousYearEnd = new Date(previousYear, month + 1, 0);

        // Filter contracts active in each month
        const currentYearContracts = contracts?.filter(c => {
          const startDate = new Date(c.start_date);
          return startDate <= currentYearEnd && 
                 (c.status === "active" || startDate <= currentYearEnd);
        }) || [];

        const previousYearContracts = contracts?.filter(c => {
          const startDate = new Date(c.start_date);
          return startDate <= previousYearEnd && 
                 startDate.getFullYear() <= previousYear;
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
