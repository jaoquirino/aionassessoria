import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Calculator,
  Send,
  CheckCircle2,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { useHideValues } from "@/hooks/useHideValues";
import {
  usePaymentPeriods,
  usePaymentPeriodTasks,
  useGeneratePaymentPeriod,
  useUpdatePaymentPeriodStatus,
  useSendApprovalNotification,
  type PaymentPeriod,
} from "@/hooks/usePaymentPeriods";
import { useAllTeamMembers } from "@/hooks/useTeamMembers";

interface PaymentPeriodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Aguardando aprovação", color: "bg-yellow-500/10 text-yellow-600" },
  approved: { label: "Aprovado", color: "bg-blue-500/10 text-blue-600" },
  paid: { label: "Pago", color: "bg-emerald-500/10 text-emerald-600" },
};

export function PaymentPeriodsDialog({ open, onOpenChange }: PaymentPeriodsDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  const { hidden: hideValues } = useHideValues();
  const { data: teamMembers = [] } = useAllTeamMembers();
  const freelancers = teamMembers.filter((m: any) => m.employment_type === "freelancer");

  const { data: periods = [], isLoading } = usePaymentPeriods(
    selectedMemberId ? { teamMemberId: selectedMemberId } : undefined
  );

  const generatePeriod = useGeneratePaymentPeriod();
  const updateStatus = useUpdatePaymentPeriodStatus();
  const sendNotification = useSendApprovalNotification();

  const handleGenerate = async () => {
    if (!selectedMemberId) return;
    await generatePeriod.mutateAsync({
      team_member_id: selectedMemberId,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const handleSendForApproval = async (period: PaymentPeriod) => {
    await updateStatus.mutateAsync({ id: period.id, status: "pending_approval" });
    await sendNotification.mutateAsync({
      periodId: period.id,
      teamMemberId: period.team_member_id,
    });
  };

  const handleMarkPaid = async (period: PaymentPeriod) => {
    await updateStatus.mutateAsync({
      id: period.id,
      status: "paid",
      total_amount: period.total_amount,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamentos de Freelancers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Generate new period */}
          <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
            <p className="text-sm font-medium">Gerar período de pagamento</p>

            <div className="space-y-2">
              <Label>Freelancer</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                <option value="">Selecionar freelancer</option>
                {freelancers.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>De</Label>
                <DatePicker value={startDate} onChange={setStartDate} />
              </div>
              <div className="space-y-1">
                <Label>Até</Label>
                <DatePicker value={endDate} onChange={setEndDate} />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedMemberId || generatePeriod.isPending}
              className="w-full gap-2"
            >
              {generatePeriod.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Calcular pagamento
            </Button>
          </div>

          <Separator />

          {/* Periods list */}
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : periods.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {selectedMemberId ? "Nenhum período encontrado" : "Selecione um freelancer para ver os períodos"}
            </p>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => (
                <PeriodCard
                  key={period.id}
                  period={period}
                  hideValues={hideValues}
                  isExpanded={expandedPeriod === period.id}
                  onToggle={() => setExpandedPeriod(expandedPeriod === period.id ? null : period.id)}
                  onSendForApproval={() => handleSendForApproval(period)}
                  onMarkPaid={() => handleMarkPaid(period)}
                  isPending={updateStatus.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PeriodCard({
  period,
  hideValues,
  isExpanded,
  onToggle,
  onSendForApproval,
  onMarkPaid,
  isPending,
}: {
  period: PaymentPeriod;
  hideValues: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSendForApproval: () => void;
  onMarkPaid: () => void;
  isPending: boolean;
}) {
  const { data: tasks = [] } = usePaymentPeriodTasks(isExpanded ? period.id : undefined);
  const status = STATUS_MAP[period.status] || STATUS_MAP.draft;

  return (
    <div className="rounded-lg border bg-card">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={period.team_member?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {period.team_member?.name?.slice(0, 2) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{period.team_member?.name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(period.start_date + "T12:00:00"), "dd/MM")} — {format(new Date(period.end_date + "T12:00:00"), "dd/MM/yyyy")}
          </p>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
        <span className="text-sm font-semibold">
          {hideValues ? "••••" : formatCurrency(Number(period.total_amount))}
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Tasks */}
          {tasks.length > 0 ? (
            <div className="space-y-1">
              {tasks.map((pt) => (
                <div key={pt.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/30">
                  <span className={`flex-1 truncate ${!pt.is_included ? "line-through text-muted-foreground" : ""}`}>
                    {pt.task?.title || "Tarefa"}
                  </span>
                  {pt.task?.deliverable_type && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{pt.task.deliverable_type}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{pt.task?.client?.name}</span>
                  <span className="font-medium whitespace-nowrap">
                    {hideValues ? "••••" : formatCurrency(Number(pt.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Carregando tarefas...</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {period.status === "draft" && (
              <Button size="sm" onClick={onSendForApproval} disabled={isPending} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Enviar para aprovação
              </Button>
            )}
            {period.status === "approved" && (
              <Button size="sm" onClick={onMarkPaid} disabled={isPending} className="gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Marcar como pago
              </Button>
            )}
            {period.status === "paid" && (
              <Badge className="bg-emerald-500/10 text-emerald-600 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pago
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
