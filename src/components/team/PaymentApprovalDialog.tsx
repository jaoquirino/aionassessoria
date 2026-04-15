import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { useHideValues } from "@/hooks/useHideValues";
import {
  usePaymentPeriodTasks,
  useUpdatePaymentPeriodStatus,
  type PaymentPeriod,
} from "@/hooks/usePaymentPeriods";
import { format } from "date-fns";

interface PaymentApprovalDialogProps {
  period: PaymentPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentApprovalDialog({ period, open, onOpenChange }: PaymentApprovalDialogProps) {
  const { hidden: hideValues } = useHideValues();
  const { data: tasks = [], isLoading } = usePaymentPeriodTasks(period?.id);
  const updateStatus = useUpdatePaymentPeriodStatus();

  if (!period) return null;

  const handleApprove = async () => {
    await updateStatus.mutateAsync({ id: period.id, status: "approved" });
    onOpenChange(false);
  };

  const handleReject = async () => {
    await updateStatus.mutateAsync({ id: period.id, status: "draft" });
    onOpenChange(false);
  };

  const includedTasks = tasks.filter(t => t.is_included);
  const totalAmount = includedTasks.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aprovar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-sm text-muted-foreground">Período</p>
            <p className="font-medium">
              {format(new Date(period.start_date + "T12:00:00"), "dd/MM/yyyy")} — {format(new Date(period.end_date + "T12:00:00"), "dd/MM/yyyy")}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Tarefas incluídas ({includedTasks.length})
            </p>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {includedTasks.map((pt) => (
                  <div key={pt.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-muted/20">
                    <span className="flex-1 truncate">{pt.task?.title || "Tarefa"}</span>
                    {pt.task?.deliverable_type && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{pt.task.deliverable_type}</Badge>
                    )}
                    <span className="font-medium">
                      {hideValues ? "••••" : formatCurrency(Number(pt.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-primary">
              {hideValues ? "••••" : formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReject} disabled={updateStatus.isPending} className="gap-1.5">
            <XCircle className="h-4 w-4" />
            Recusar
          </Button>
          <Button onClick={handleApprove} disabled={updateStatus.isPending} className="gap-1.5">
            {updateStatus.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
