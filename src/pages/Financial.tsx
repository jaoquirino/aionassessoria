import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Plus,
  Filter,
  Settings2,
  Trash2,
  Users,
  FileText,
  Calculator,
  Send,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Undo2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/date-picker";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { formatCurrency } from "@/lib/formatCurrency";
import { useHideValues } from "@/hooks/useHideValues";
import {
  useFinancialTransactions,
  useFinancialCategories,
  useDeleteTransaction,
  type FinancialTransaction,
} from "@/hooks/useFinancialTransactions";
import { useAllClients } from "@/hooks/useClients";
import { TransactionDialog } from "@/components/financial/TransactionDialog";
import { CategoryManagerDialog } from "@/components/financial/CategoryManagerDialog";
import {
  usePaymentPeriods,
  usePaymentPeriodTasks,
  useGeneratePaymentPeriod,
  useUpdatePaymentPeriodStatus,
  useSendApprovalNotification,
  type PaymentPeriod,
} from "@/hooks/usePaymentPeriods";
import { useAllTeamMembers } from "@/hooks/useTeamMembers";
import {
  useContractPayments,
  useGenerateContractPayments,
  useMarkContractPaymentPaid,
  useUnmarkContractPayment,
} from "@/hooks/useContractPayments";
import { subMonths } from "date-fns";

export default function Financial() {
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { hidden: hideValues } = useHideValues();

  const startDate = format(startOfMonth(new Date(currentMonth + "-01")), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(currentMonth + "-01")), "yyyy-MM-dd");

  const { data: transactions = [], isLoading } = useFinancialTransactions({
    startDate,
    endDate,
    type: typeFilter === "all" ? undefined : typeFilter,
    categoryId: categoryFilter === "all" ? undefined : categoryFilter,
  });

  const { data: categories = [] } = useFinancialCategories();
  const { data: clients = [] } = useAllClients();
  const deleteTransaction = useDeleteTransaction();

  const summary = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const months = useMemo(() => {
    const result: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push(format(d, "yyyy-MM"));
    }
    return result;
  }, []);

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTransaction(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransaction.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Central de controle financeiro</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCategoryManagerOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Categorias
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {hideValues ? "••••" : formatCurrency(summary.income)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saídas</p>
                <p className="text-2xl font-bold text-red-500">
                  {hideValues ? "••••" : formatCurrency(summary.expense)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {hideValues ? "••••" : formatCurrency(summary.balance)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={currentMonth} onValueChange={setCurrentMonth}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {format(new Date(m + "-01"), "MMMM yyyy", { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lancamentos" className="gap-1.5">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Lançamentos</span>
          </TabsTrigger>
          <TabsTrigger value="recebimentos" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Recebimentos</span>
          </TabsTrigger>
          <TabsTrigger value="freelancers" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Freelancers</span>
          </TabsTrigger>
        </TabsList>

        {/* Lançamentos Tab */}
        <TabsContent value="lancamentos" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="expense">Saídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Lançamentos
                <Badge variant="secondary" className="ml-auto">{transactions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado neste período.
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(t)}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.category?.color || (t.type === "income" ? "#22C55E" : "#EF4444") }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {t.description || (t.type === "income" ? "Entrada" : "Saída")}
                          </span>
                          {t.is_auto_generated && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">Auto</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {t.category && (
                            <span className="text-xs text-muted-foreground">{t.category.name}</span>
                          )}
                          {t.client && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">{t.client.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                          {t.type === "income" ? "+" : "-"}{hideValues ? "••••" : formatCurrency(Number(t.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(t.date + "T12:00:00"), "dd/MM")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recebimentos Tab */}
        <TabsContent value="recebimentos">
          <ContractPaymentsTab hideValues={hideValues} currentMonth={currentMonth} />
        </TabsContent>

        {/* Freelancers Tab */}
        <TabsContent value="freelancers">
          <FreelancerPaymentsTab hideValues={hideValues} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTransaction(null); }}
        transaction={editingTransaction}
        categories={categories}
        clients={clients}
      />

      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===== Contract Payments Tab =====
function ContractPaymentsTab({ hideValues, currentMonth }: { hideValues: boolean; currentMonth: string }) {
  const { data: clients = [] } = useAllClients();
  const generatePayments = useGenerateContractPayments();
  const markPaid = useMarkContractPaymentPaid();
  const unmarkPayment = useUnmarkContractPayment();

  // Build list of active contracts grouped by client
  const clientContracts = useMemo(() => {
    const grouped: Array<{
      client: { id: string; name: string; logo_url: string | null; color: string | null };
      contracts: any[];
    }> = [];

    clients.forEach((client: any) => {
      if (client.is_internal) return;
      const activeContracts = (client.contracts || []).filter((c: any) => c.status === "active");
      if (activeContracts.length === 0) return;

      grouped.push({
        client: { id: client.id, name: client.name, logo_url: client.logo_url, color: client.color },
        contracts: activeContracts,
      });
    });

    return grouped.sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [clients]);


  if (clientContracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhum contrato ativo encontrado.
        </CardContent>
      </Card>
    );
  }

  const selectedMonthRef = `${currentMonth}-01`; // e.g. "2026-04-01"

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Recebimentos do mês selecionado. Marque como pago para gerar uma entrada automática.
      </p>
      {clientContracts.map(({ client, contracts: clientCtrcts }) => (
        <Card key={client.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {client.logo_url ? (
                <img src={client.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
              ) : (
                <div className="h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: client.color || "hsl(var(--primary))", color: "white" }}>
                  {client.name[0]}
                </div>
              )}
              {client.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {clientCtrcts.map((contract: any) => (
              <ContractMonthPaymentRow
                key={contract.id}
                contractId={contract.id}
                monthlyValue={Number(contract.monthly_value)}
                hideValues={hideValues}
                referenceMonth={selectedMonthRef}
                markPaid={markPaid}
                unmarkPayment={unmarkPayment}
                generatePayments={generatePayments}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Shows a single month's payment for a contract
function ContractMonthPaymentRow({
  contractId,
  monthlyValue,
  hideValues,
  referenceMonth,
  markPaid,
  unmarkPayment,
  generatePayments,
}: {
  contractId: string;
  monthlyValue: number;
  hideValues: boolean;
  referenceMonth: string;
  markPaid: ReturnType<typeof useMarkContractPaymentPaid>;
  unmarkPayment: ReturnType<typeof useUnmarkContractPayment>;
  generatePayments: ReturnType<typeof useGenerateContractPayments>;
}) {
  const { data: allPayments = [], isLoading } = useContractPayments(contractId);

  // Find payment for this specific month
  const payment = allPayments.find(p => p.reference_month === referenceMonth);

  if (isLoading) {
    return <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  // If no payment exists for this month, offer to generate
  if (!payment) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
        <span className="text-sm text-muted-foreground">
          {hideValues ? "••••" : formatCurrency(monthlyValue)}/mês — Sem registro para este mês
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generatePayments.mutateAsync(contractId)}
          disabled={generatePayments.isPending}
          className="gap-1.5 h-7 text-xs"
        >
          {generatePayments.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Gerar
        </Button>
      </div>
    );
  }

  const isPaid = payment.status === "paid";

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      {isPaid ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {isPaid ? "Recebido" : "Pendente"}
        </p>
        {isPaid && payment.paid_at && (
          <p className="text-xs text-muted-foreground">
            Pago em {format(new Date(payment.paid_at), "dd/MM/yyyy")}
          </p>
        )}
      </div>
      <span className="text-sm font-medium">{hideValues ? "••••" : formatCurrency(monthlyValue)}</span>
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
}

// ===== Freelancer Payments Tab =====
function FreelancerPaymentsTab({ hideValues }: { hideValues: boolean }) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

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
    <div className="space-y-4">
      {/* Generate new period */}
      <Card>
        <CardContent className="pt-6 space-y-3">
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
        </CardContent>
      </Card>

      {/* Periods list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : periods.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {selectedMemberId ? "Nenhum período encontrado" : "Selecione um freelancer para ver os períodos"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <FreelancerPeriodCard
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
  );
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Aguardando aprovação", color: "bg-yellow-500/10 text-yellow-600" },
  approved: { label: "Aprovado", color: "bg-blue-500/10 text-blue-600" },
  paid: { label: "Pago", color: "bg-emerald-500/10 text-emerald-600" },
};

function FreelancerPeriodCard({
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
    <Card>
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
    </Card>
  );
}
