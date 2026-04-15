import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, RefreshCw, Undo2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatCurrency";
import { useHideValues } from "@/hooks/useHideValues";
import {
  useContractPayments,
  useGenerateContractPayments,
  useMarkContractPaymentPaid,
  useUnmarkContractPayment,
} from "@/hooks/useContractPayments";

interface ContractPaymentsSectionProps {
  contractId: string;
  monthlyValue: number;
}

export function ContractPaymentsSection({ contractId, monthlyValue }: ContractPaymentsSectionProps) {
  const { hidden: hideValues } = useHideValues();
  const { data: payments = [], isLoading } = useContractPayments(contractId);
  const generatePayments = useGenerateContractPayments();
  const markPaid = useMarkContractPaymentPaid();
  const unmarkPayment = useUnmarkContractPayment();

  const handleGenerate = () => generatePayments.mutateAsync(contractId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Pagamentos Mensais</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generatePayments.isPending}
          className="gap-1.5 h-7 text-xs"
        >
          {generatePayments.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Atualizar meses
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">Nenhum pagamento gerado ainda</p>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generatePayments.isPending}>
            Gerar pagamentos
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {payments.map((payment) => {
            const isPaid = payment.status === "paid";
            return (
              <div
                key={payment.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                {isPaid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {format(parseISO(payment.reference_month), "MMMM yyyy", { locale: ptBR })}
                  </p>
                  {isPaid && payment.paid_at && (
                    <p className="text-xs text-muted-foreground">
                      Pago em {format(new Date(payment.paid_at), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium">
                  {hideValues ? "••••" : formatCurrency(monthlyValue)}
                </span>
                {isPaid ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => unmarkPayment.mutateAsync({ paymentId: payment.id, contractId })}
                    disabled={unmarkPayment.isPending}
                    title="Reverter"
                  >
                    <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => markPaid.mutateAsync({ paymentId: payment.id, contractId })}
                    disabled={markPaid.isPending}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Pago
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
