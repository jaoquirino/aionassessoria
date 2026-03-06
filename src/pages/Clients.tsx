import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Clock, Loader2, AlertTriangle, Calendar, FileText, DollarSign, CreditCard, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, parseLocalDate } from "@/lib/utils";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { OnboardingClientCard } from "@/components/clients/OnboardingClientCard";
import { useAllClients, type ClientWithContracts } from "@/hooks/useClients";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig = {
  onboarding: { label: "Onboarding", color: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  active: { label: "Ativo", color: "bg-success/20 text-success border-success/30" },
  paused: { label: "Pausado", color: "bg-warning/20 text-warning border-warning/30" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground border-muted" },
};

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingClient, setEditingClient] = useState<ClientWithContracts | null>(null);
  const [openContractOnEdit, setOpenContractOnEdit] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [initialSection, setInitialSection] = useState<"status" | "contracts" | "value" | null>(null);

  const { data: clients = [], isLoading, refetch } = useAllClients();

  useEffect(() => {
    if (pendingClientId) {
      const newClient = clients.find(c => c.id === pendingClientId);
      if (newClient) {
        setEditingClient(newClient);
        setOpenContractOnEdit(true);
        setPendingClientId(null);
      }
    }
  }, [clients, pendingClientId]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        search === "" ||
        client.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const onboardingClients = filteredClients.filter((c) => c.status === "onboarding");
  const otherClients = filteredClients.filter((c) => c.status !== "onboarding");

  const contractsNeedingAttention = useMemo(() => {
    let count = 0;
    clients.forEach(client => {
      client.contracts?.forEach(contract => {
        if (contract.renewal_date && contract.status !== "ended") {
          const daysUntilRenewal = differenceInDays(parseLocalDate(contract.renewal_date), new Date());
          if (daysUntilRenewal <= 30 && daysUntilRenewal > 0) {
            count++;
          }
        }
      });
    });
    return count;
  }, [clients]);

  const handleContinueOnboarding = (clientId: string) => {
    navigate(`/clientes/${clientId}/onboarding`);
  };

  const handleGoToContract = (client: ClientWithContracts) => {
    setEditingClient(client);
    setOpenContractOnEdit(false);
  };

  const handleCancelOnboarding = async (clientId: string) => {
    try {
      await supabase.from("client_module_onboarding").delete().eq("client_id", clientId);
      await supabase.from("client_onboarding").delete().eq("client_id", clientId);
      const { error } = await supabase.from("clients").update({ status: "active" }).eq("id", clientId);
      if (error) throw error;
      toast.success("Onboarding cancelado com sucesso");
      refetch();
    } catch (error) {
      console.error("Error canceling onboarding:", error);
      toast.error("Erro ao cancelar onboarding");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const openClientWithSection = (client: ClientWithContracts, section: "status" | "contracts" | "value" | null) => {
    setEditingClient(client);
    setInitialSection(section);
    setOpenContractOnEdit(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie clientes e contratos
          </p>
        </div>
        <AddClientDialog 
          onClientAdded={() => {}} 
          onClientCreatedForOnboarding={async (clientId) => {
            await refetch();
            setPendingClientId(clientId);
          }}
        />
      </motion.div>

      {/* Contract Alert */}
      {contractsNeedingAttention > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 rounded-xl border border-warning/30 bg-warning/10 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/20">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {contractsNeedingAttention} contrato{contractsNeedingAttention > 1 ? "s" : ""} próximo{contractsNeedingAttention > 1 ? "s" : ""} da renovação
            </p>
            <p className="text-sm text-muted-foreground">
              Clique em um cliente para ver detalhes do contrato
            </p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="onboarding">Em Onboarding</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="ended">Encerrado</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Onboarding Section */}
      {onboardingClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold text-foreground">Em Onboarding</h2>
            <Badge variant="secondary">{onboardingClients.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {onboardingClients.map((client, index) => (
              <OnboardingClientCard
                key={client.id}
                client={client}
                index={index}
                onContinue={handleContinueOnboarding}
                onEditContract={handleGoToContract}
                onCancel={handleCancelOnboarding}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Column Headers */}
      {otherClients.length > 0 && (
        <div className="hidden sm:grid grid-cols-[1fr_auto] items-center px-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</span>
          <div className="flex items-center gap-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="w-16 text-center">Status</span>
            <span className="w-20 text-center">Contratos</span>
            <span className="w-24 text-center">MRR</span>
            <span className="w-16 text-center">Pgto</span>
            <span className="w-32 text-center">Vencimento</span>
          </div>
        </div>
      )}

      {/* Client Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-1.5"
      >
        {otherClients.map((client, index) => {
          const activeContracts = client.contracts?.filter(c => c.status === "active") || [];
          const mrr = activeContracts.reduce((sum, c) => sum + c.monthly_value, 0);

          // Get nearest renewal only from recurring contracts
          const recurringContracts = activeContracts.filter(c => c.is_recurring && c.renewal_date);
          const renewalDates = recurringContracts.map(c => ({
            date: parseLocalDate(c.renewal_date!),
            days: differenceInDays(parseLocalDate(c.renewal_date!), new Date()),
          }));
          const nearestRenewal = renewalDates.length > 0 
            ? renewalDates.reduce((a, b) => a.days < b.days ? a : b) 
            : null;
          const isRenewalClose = nearestRenewal && nearestRenewal.days <= 60 && nearestRenewal.days > 0;

          // Payment day - get from first active contract
          const paymentDay = activeContracts.length > 0 ? (activeContracts[0].payment_due_day ?? 10) : null;

          const statusInfo = statusConfig[client.status];

          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.03 * index }}
              className="glass rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => openClientWithSection(client, null)}
            >
              <div className="flex items-center gap-4">
                {/* Client Identity */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt="" className="w-10 h-10 object-contain shrink-0" />
                  ) : client.color ? (
                    <div className="w-10 h-10 rounded-lg shrink-0 border border-border" style={{ backgroundColor: client.color }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg shrink-0 bg-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">{client.name.charAt(0)}</span>
                    </div>
                  )}
                  <p className="font-semibold text-foreground truncate">{client.name}</p>
                </div>

                {/* Desktop Inline Metrics */}
                <div className="hidden sm:flex items-center gap-6">
                  {/* Status */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs cursor-pointer w-16 justify-center", statusInfo.color)}
                        onClick={(e) => { e.stopPropagation(); openClientWithSection(client, "status"); }}
                      >
                        {statusInfo.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Clique para alterar status</TooltipContent>
                  </Tooltip>

                  {/* Active Contracts */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center gap-1.5 w-20 justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openClientWithSection(client, "contracts"); }}
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{activeContracts.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Contratos ativos · Clique para ver</TooltipContent>
                  </Tooltip>

                  {/* MRR */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center gap-1.5 w-24 justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openClientWithSection(client, "contracts"); }}
                      >
                        <DollarSign className="h-3.5 w-3.5 text-success" />
                        <span className={cn("text-sm font-medium", mrr > 0 ? "text-success" : "text-muted-foreground")}>
                          {mrr > 0 ? formatCurrency(mrr).replace("R$", "").trim() : "—"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Receita mensal recorrente</TooltipContent>
                  </Tooltip>

                  {/* Payment Day */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center gap-1.5 w-16 justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openClientWithSection(client, "contracts"); }}
                      >
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{paymentDay ?? "—"}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Dia de pagamento</TooltipContent>
                  </Tooltip>

                  {/* Renewal */}
                  <div className="w-32 flex justify-center">
                    {nearestRenewal ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); openClientWithSection(client, "contracts"); }}
                          >
                            <Badge 
                              variant="outline"
                              className={cn(
                                "text-xs gap-1",
                                isRenewalClose && nearestRenewal.days <= 30
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : isRenewalClose
                                  ? "bg-warning/10 text-warning border-warning/30"
                                  : "text-muted-foreground"
                              )}
                            >
                              <Calendar className="h-3 w-3" />
                              {nearestRenewal.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
                            </Badge>
                            {isRenewalClose && (
                              <span className={cn(
                                "text-xs font-semibold",
                                nearestRenewal.days <= 30 ? "text-destructive" : "text-warning"
                              )}>
                                {nearestRenewal.days}d
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Vencimento do contrato</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile: show info below */}
              <div className="flex sm:hidden items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <FileText className="h-3 w-3" />
                  {activeContracts.length}
                </Badge>
                {mrr > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 bg-success/10 text-success border-success/30">
                    {formatCurrency(mrr)}
                  </Badge>
                )}
                {paymentDay && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <CreditCard className="h-3 w-3" />
                    Dia {paymentDay}
                  </Badge>
                )}
                {nearestRenewal && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs gap-1",
                      isRenewalClose && nearestRenewal.days <= 30
                        ? "bg-destructive/10 text-destructive border-destructive/30"
                        : isRenewalClose
                        ? "bg-warning/10 text-warning border-warning/30"
                        : "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    {nearestRenewal.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
                    {isRenewalClose && (
                      <span className="font-semibold">{nearestRenewal.days}d</span>
                    )}
                  </Badge>
                )}
              </div>
            </motion.div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="glass rounded-xl px-6 py-12 text-center text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        )}
      </motion.div>

      {/* Edit Client Dialog */}
      <EditClientDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setEditingClient(null);
            setOpenContractOnEdit(false);
            setInitialSection(null);
          }
        }}
        onClientUpdated={() => refetch()}
        openContractDialogOnMount={openContractOnEdit}
        initialSection={initialSection}
      />
    </div>
    </TooltipProvider>
  );
}
