import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Clock, Loader2, AlertTriangle, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onboarding: { label: "Onboarding", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", ringColor: "ring-blue-500" },
  active: { label: "Ativo", color: "bg-success/20 text-success border-success/30", ringColor: "ring-success" },
  paused: { label: "Pausado", color: "bg-warning/20 text-warning border-warning/30", ringColor: "ring-warning" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground border-muted", ringColor: "ring-muted-foreground" },
};

function CircleIndicator({ 
  label, 
  value, 
  color = "text-foreground",
  ringColor = "ring-border",
  subValue,
  subColor,
  size = "md",
}: { 
  label: string; 
  value: string | number; 
  color?: string;
  ringColor?: string;
  subValue?: string;
  subColor?: string;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "w-12 h-12" : "w-14 h-14";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        sizeClasses,
        "rounded-full ring-2 flex flex-col items-center justify-center bg-background",
        ringColor
      )}>
        <span className={cn("font-bold text-xs leading-tight", color)}>{value}</span>
        {subValue && (
          <span className={cn("text-[9px] leading-tight", subColor || "text-muted-foreground")}>{subValue}</span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-16">{label}</span>
    </div>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingClient, setEditingClient] = useState<ClientWithContracts | null>(null);
  const [openContractOnEdit, setOpenContractOnEdit] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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

      {/* Client Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        {otherClients.map((client, index) => {
          const activeContracts = client.contracts?.filter(c => c.status === "active") || [];
          const mrr = activeContracts.reduce((sum, c) => sum + c.monthly_value, 0);

          const renewalDates = activeContracts
            .filter(c => c.renewal_date)
            .map(c => parseLocalDate(c.renewal_date!));
          const nearestRenewal = renewalDates.length > 0 
            ? renewalDates.reduce((a, b) => a < b ? a : b) 
            : null;
          const daysUntilRenewal = nearestRenewal 
            ? differenceInDays(nearestRenewal, new Date()) 
            : null;

          const renewalColor = daysUntilRenewal !== null && daysUntilRenewal <= 30 
            ? "text-destructive" 
            : daysUntilRenewal !== null && daysUntilRenewal <= 60 
              ? "text-warning" 
              : "text-foreground";
          const renewalRing = daysUntilRenewal !== null && daysUntilRenewal <= 30 
            ? "ring-destructive" 
            : daysUntilRenewal !== null && daysUntilRenewal <= 60 
              ? "ring-warning" 
              : "ring-border";

          const clientSince = parseLocalDate(client.created_at.split("T")[0]);
          const sinceMonth = clientSince.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
          const sinceYear = clientSince.getFullYear().toString().slice(2);

          const statusInfo = statusConfig[client.status];

          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.03 * index }}
              className="glass rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => setEditingClient(client)}
            >
              <div className="flex items-center gap-4">
                {/* Client Identity */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt="" className="w-10 h-10 object-contain shrink-0 rounded-lg" />
                  ) : client.color ? (
                    <div className="w-10 h-10 rounded-lg shrink-0 border border-border" style={{ backgroundColor: client.color }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg shrink-0 bg-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">{client.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {clientSince.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Circle Indicators */}
                <div className="hidden sm:flex items-center gap-4">
                  {/* Status */}
                  <CircleIndicator
                    label="Status"
                    value={statusInfo.label}
                    color={statusInfo.color.split(" ").find(c => c.startsWith("text-")) || "text-foreground"}
                    ringColor={statusInfo.ringColor}
                    size="sm"
                  />

                  {/* Active Contracts */}
                  <CircleIndicator
                    label="Contratos"
                    value={activeContracts.length}
                    color={activeContracts.length > 0 ? "text-primary" : "text-muted-foreground"}
                    ringColor={activeContracts.length > 0 ? "ring-primary" : "ring-border"}
                  />

                  {/* MRR */}
                  <CircleIndicator
                    label="MRR"
                    value={mrr > 0 ? formatCurrency(mrr).replace("R$", "").trim() : "—"}
                    color={mrr > 0 ? "text-success" : "text-muted-foreground"}
                    ringColor={mrr > 0 ? "ring-success" : "ring-border"}
                    subValue={mrr > 0 ? "R$" : undefined}
                    subColor="text-success/70"
                  />

                  {/* Renewal */}
                  <CircleIndicator
                    label="Vencimento"
                    value={nearestRenewal 
                      ? nearestRenewal.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                      : "—"
                    }
                    color={renewalColor}
                    ringColor={renewalRing}
                    subValue={daysUntilRenewal !== null && daysUntilRenewal <= 60 && daysUntilRenewal > 0 
                      ? `${daysUntilRenewal}d` 
                      : undefined
                    }
                    subColor={renewalColor}
                  />

                  {/* Client Since */}
                  <CircleIndicator
                    label="Desde"
                    value={`${sinceMonth}`}
                    color="text-muted-foreground"
                    ringColor="ring-border"
                    subValue={`/${sinceYear}`}
                  />
                </div>

                {/* Edit Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingClient(client);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile: show indicators below */}
              <div className="flex sm:hidden items-center justify-around mt-3 pt-3 border-t border-border">
                <CircleIndicator
                  label="Status"
                  value={statusInfo.label}
                  color={statusInfo.color.split(" ").find(c => c.startsWith("text-")) || "text-foreground"}
                  ringColor={statusInfo.ringColor}
                  size="sm"
                />
                <CircleIndicator
                  label="Contratos"
                  value={activeContracts.length}
                  color={activeContracts.length > 0 ? "text-primary" : "text-muted-foreground"}
                  ringColor={activeContracts.length > 0 ? "ring-primary" : "ring-border"}
                  size="sm"
                />
                <CircleIndicator
                  label="MRR"
                  value={mrr > 0 ? formatCurrency(mrr).replace("R$", "").trim() : "—"}
                  color={mrr > 0 ? "text-success" : "text-muted-foreground"}
                  ringColor={mrr > 0 ? "ring-success" : "ring-border"}
                  size="sm"
                />
                <CircleIndicator
                  label="Vencimento"
                  value={nearestRenewal 
                    ? nearestRenewal.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                    : "—"
                  }
                  color={renewalColor}
                  ringColor={renewalRing}
                  size="sm"
                />
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
          }
        }}
        onClientUpdated={() => refetch()}
        openContractDialogOnMount={openContractOnEdit}
      />
    </div>
  );
}
