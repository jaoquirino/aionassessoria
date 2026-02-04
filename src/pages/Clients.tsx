import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, UserCheck, Clock, Loader2, AlertTriangle, Pencil } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { OnboardingClientCard } from "@/components/clients/OnboardingClientCard";
import { useAllClients, type ClientWithContracts } from "@/hooks/useClients";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig = {
  onboarding: { label: "Em Onboarding", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Clock },
  active: { label: "Ativo", color: "bg-success/20 text-success border-success/30", icon: UserCheck },
  paused: { label: "Pausado", color: "bg-warning/20 text-warning border-warning/30", icon: Clock },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
};

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingClient, setEditingClient] = useState<ClientWithContracts | null>(null);
  const [openContractOnEdit, setOpenContractOnEdit] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);

  const { data: clients = [], isLoading, refetch } = useAllClients();

  // When clients are loaded and we have a pending client to edit, open the edit dialog
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

  // Separate onboarding clients from active clients
  const onboardingClients = filteredClients.filter((c) => c.status === "onboarding");
  const otherClients = filteredClients.filter((c) => c.status !== "onboarding");

  // Calculate contracts needing attention
  const contractsNeedingAttention = useMemo(() => {
    let count = 0;
    clients.forEach(client => {
      client.contracts?.forEach(contract => {
        if (contract.renewal_date && contract.status !== "ended") {
          const daysUntilRenewal = differenceInDays(new Date(contract.renewal_date), new Date());
          if (daysUntilRenewal <= 30 && daysUntilRenewal > 0) {
            count++;
          }
        }
      });
    });
    return count;
  }, [clients]);

  const totalMRR = useMemo(() => {
    return clients.reduce((acc, client) => {
      const activeContracts = client.contracts?.filter(c => c.status === "active") || [];
      return acc + activeContracts.reduce((sum, c) => sum + c.monthly_value, 0);
    }, 0);
  }, [clients]);

  const handleContinueOnboarding = (clientId: string) => {
    navigate(`/clientes/${clientId}/onboarding`);
  };

  const handleGoToContract = (client: ClientWithContracts) => {
    // Set only the editing client, don't set openContractOnEdit to trigger onboarding progress
    setEditingClient(client);
    setOpenContractOnEdit(false);
  };

  const handleCancelOnboarding = async (clientId: string) => {
    try {
      // Delete client module onboarding records
      await supabase
        .from("client_module_onboarding")
        .delete()
        .eq("client_id", clientId);

      // Delete legacy client_onboarding records if any
      await supabase
        .from("client_onboarding")
        .delete()
        .eq("client_id", clientId);

      // Update client status back to active (or another appropriate status)
      const { error } = await supabase
        .from("clients")
        .update({ status: "active" })
        .eq("id", clientId);

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
            // Refetch and wait for completion, then set pending client ID
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

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-5"
      >
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Em Onboarding</p>
          <p className="text-2xl font-bold text-blue-500">
            {clients.filter((c) => c.status === "onboarding").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Clientes Ativos</p>
          <p className="text-2xl font-bold text-foreground">
            {clients.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Pausados</p>
          <p className="text-2xl font-bold text-warning">
            {clients.filter((c) => c.status === "paused").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">MRR Total</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(totalMRR)}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{clients.length}</p>
        </div>
      </motion.div>

      {/* Onboarding Alert */}
      {onboardingClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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

      {/* Client List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contratos
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  MRR
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Vencimento
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cliente Desde
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {otherClients.map((client, index) => {
                const activeContracts = client.contracts?.filter(c => c.status === "active") || [];
                const mrr = activeContracts.reduce((sum, c) => sum + c.monthly_value, 0);
                
                // Get nearest renewal date
                const renewalDates = activeContracts
                  .filter(c => c.renewal_date)
                  .map(c => new Date(c.renewal_date!));
                const nearestRenewal = renewalDates.length > 0 
                  ? renewalDates.reduce((a, b) => a < b ? a : b) 
                  : null;
                const daysUntilRenewal = nearestRenewal 
                  ? differenceInDays(nearestRenewal, new Date()) 
                  : null;
                const isNearRenewal = daysUntilRenewal !== null && daysUntilRenewal <= 30 && daysUntilRenewal > 0;

                return (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 * index }}
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setEditingClient(client)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">
                        {client.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={cn(statusConfig[client.status].color)}
                      >
                        {statusConfig[client.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {activeContracts.length} ativo{activeContracts.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {formatCurrency(mrr)}
                    </td>
                    <td className="px-6 py-4">
                      {nearestRenewal ? (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm",
                            isNearRenewal ? "text-warning font-medium" : "text-muted-foreground"
                          )}>
                            {nearestRenewal.toLocaleDateString("pt-BR")}
                          </span>
                          {isNearRenewal && (
                            <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
                              {daysUntilRenewal}d
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClient(client);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
