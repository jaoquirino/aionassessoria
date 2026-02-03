import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MoreHorizontal, UserCheck, Clock, Loader2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  status: "onboarding" | "active" | "paused" | "ended";
  created_at: string;
}

const statusConfig = {
  onboarding: { label: "Em Onboarding", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Clock },
  active: { label: "Ativo", color: "bg-success/20 text-success border-success/30", icon: UserCheck },
  paused: { label: "Pausado", color: "bg-warning/20 text-warning border-warning/30", icon: Clock },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
};

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

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

  const handleContinueOnboarding = (clientId: string) => {
    navigate(`/clientes/${clientId}/onboarding`);
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
            Gerencie sua base de clientes
          </p>
        </div>
        <AddClientDialog onClientAdded={fetchClients} />
      </motion.div>

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
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
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
              <motion.div
                key={client.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index }}
                className="glass rounded-xl p-4 border-blue-500/30 bg-blue-500/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">{client.name}</span>
                  <Badge variant="outline" className={cn(statusConfig.onboarding.color)}>
                    {statusConfig.onboarding.label}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => handleContinueOnboarding(client.id)}
                >
                  Continuar Onboarding
                </Button>
              </motion.div>
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
                  Cliente Desde
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {otherClients.map((client, index) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * index }}
                  className="group hover:bg-muted/30 transition-colors"
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
                    {new Date(client.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background">
                        <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Novo contrato</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
