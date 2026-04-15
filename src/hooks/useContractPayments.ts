import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, addMonths, parseISO } from "date-fns";

export interface ContractPayment {
  id: string;
  contract_id: string;
  reference_month: string;
  status: "pending" | "paid";
  paid_at: string | null;
  financial_transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useContractPayments(contractId?: string) {
  return useQuery({
    queryKey: ["contract_payments", contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", contractId!)
        .order("reference_month", { ascending: false });
      if (error) throw error;
      return data as ContractPayment[];
    },
  });
}

// Generate monthly payments for a contract
export function useGenerateContractPayments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: string) => {
      // Get contract details
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .select("*, client:clients(name)")
        .eq("id", contractId)
        .single();

      if (contractError) throw contractError;
      if (!contract) throw new Error("Contrato não encontrado");

      // Get existing payments
      const { data: existing } = await supabase
        .from("contract_payments")
        .select("reference_month")
        .eq("contract_id", contractId);

      const existingMonths = new Set(existing?.map(e => e.reference_month) || []);

      // Generate from start_date to current month
      const start = startOfMonth(parseISO(contract.start_date));
      const now = startOfMonth(new Date());
      const payments: Array<{ contract_id: string; reference_month: string }> = [];

      let current = start;
      while (current <= now) {
        const month = format(current, "yyyy-MM-dd");
        if (!existingMonths.has(month)) {
          payments.push({ contract_id: contractId, reference_month: month });
        }
        current = addMonths(current, 1);
      }

      if (payments.length > 0) {
        const { error } = await supabase.from("contract_payments").insert(payments);
        if (error) throw error;
      }

      return payments.length;
    },
    onSuccess: (count, contractId) => {
      queryClient.invalidateQueries({ queryKey: ["contract_payments", contractId] });
      if (count > 0) {
        toast.success(`${count} mês(es) de pagamento gerado(s)`);
      } else {
        toast.info("Todos os meses já estão registrados");
      }
    },
    onError: () => toast.error("Erro ao gerar pagamentos"),
  });
}

// Mark contract payment as paid (generates financial transaction)
export function useMarkContractPaymentPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { paymentId: string; contractId: string }) => {
      // Get payment and contract info
      const { data: payment } = await supabase
        .from("contract_payments")
        .select("*, contract:contracts(monthly_value, client:clients(name))")
        .eq("id", input.paymentId)
        .single();

      if (!payment) throw new Error("Pagamento não encontrado");

      const contract = payment.contract as any;
      const clientName = contract?.client?.name || "Cliente";
      const monthlyValue = Number(contract?.monthly_value || 0);
      const refMonth = payment.reference_month;

      // Create financial transaction (income)
      const { data: transaction, error: txError } = await supabase
        .from("financial_transactions")
        .insert({
          type: "income",
          amount: monthlyValue,
          description: `Recebimento contrato - ${clientName} (${format(parseISO(refMonth), "MM/yyyy")})`,
          date: new Date().toISOString().split("T")[0],
          client_id: contract?.client?.id || null,
          contract_id: input.contractId,
          is_auto_generated: true,
          reference_month: refMonth,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update payment status
      const { error } = await supabase
        .from("contract_payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          financial_transaction_id: transaction?.id || null,
        })
        .eq("id", input.paymentId);

      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contract_payments", vars.contractId] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Pagamento marcado como recebido e entrada gerada no financeiro");
    },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });
}

// Unmark payment (revert to pending)
export function useUnmarkContractPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { paymentId: string; contractId: string }) => {
      // Get payment to find linked transaction
      const { data: payment } = await supabase
        .from("contract_payments")
        .select("financial_transaction_id")
        .eq("id", input.paymentId)
        .single();

      // Delete linked financial transaction
      if (payment?.financial_transaction_id) {
        await supabase
          .from("financial_transactions")
          .delete()
          .eq("id", payment.financial_transaction_id);
      }

      // Revert payment status
      const { error } = await supabase
        .from("contract_payments")
        .update({
          status: "pending",
          paid_at: null,
          financial_transaction_id: null,
        })
        .eq("id", input.paymentId);

      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contract_payments", vars.contractId] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Pagamento revertido para pendente");
    },
    onError: () => toast.error("Erro ao reverter pagamento"),
  });
}
