import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search, MoreHorizontal, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Contract {
  id: string;
  clientName: string;
  monthlyValue: number;
  startDate: string;
  minDuration: number;
  renewalDate: string;
  daysUntilRenewal: number;
  status: "active" | "expiring_soon" | "renewing" | "ended";
  modules: string[];
}

const mockContracts: Contract[] = [
  {
    id: "1",
    clientName: "Tech Solutions",
    monthlyValue: 5000,
    startDate: "2023-06-15",
    minDuration: 12,
    renewalDate: "2024-06-15",
    daysUntilRenewal: 150,
    status: "active",
    modules: ["Gestão de Tráfego", "Copywriting", "Design"],
  },
  {
    id: "2",
    clientName: "Loja Fashion",
    monthlyValue: 3500,
    startDate: "2023-08-20",
    minDuration: 6,
    renewalDate: "2024-02-20",
    daysUntilRenewal: 25,
    status: "expiring_soon",
    modules: ["Gestão de Tráfego", "Design"],
  },
  {
    id: "3",
    clientName: "Restaurante Bella",
    monthlyValue: 2800,
    startDate: "2023-09-10",
    minDuration: 6,
    renewalDate: "2024-01-28",
    daysUntilRenewal: 7,
    status: "renewing",
    modules: ["Design", "Cardápio Digital"],
  },
  {
    id: "4",
    clientName: "Fit Academia",
    monthlyValue: 2200,
    startDate: "2023-07-05",
    minDuration: 12,
    renewalDate: "2024-07-05",
    daysUntilRenewal: 180,
    status: "active",
    modules: ["Gestão de Tráfego", "Landing Pages"],
  },
  {
    id: "5",
    clientName: "Auto Peças Silva",
    monthlyValue: 0,
    startDate: "2022-12-15",
    minDuration: 6,
    renewalDate: "2023-06-15",
    daysUntilRenewal: 0,
    status: "ended",
    modules: [],
  },
];

const statusConfig = {
  active: { label: "Ativo", color: "bg-success/20 text-success border-success/30" },
  expiring_soon: { label: "Próximo do vencimento", color: "bg-warning/20 text-warning border-warning/30" },
  renewing: { label: "Em renovação", color: "bg-primary/20 text-primary border-primary/30" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground border-muted" },
};

export default function Contracts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  const allModules = useMemo(() => {
    const modules = new Set<string>();
    mockContracts.forEach((c) => c.modules.forEach((m) => modules.add(m)));
    return Array.from(modules).sort();
  }, []);

  const filteredContracts = useMemo(() => {
    return mockContracts.filter((contract) => {
      const matchesSearch =
        search === "" ||
        contract.clientName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      const matchesModule = moduleFilter === "all" || contract.modules.includes(moduleFilter);

      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [search, statusFilter, moduleFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const activeContracts = mockContracts.filter((c) => c.status !== "ended");
  const alertContracts = mockContracts.filter((c) => c.status === "expiring_soon" || c.status === "renewing");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">
            Gerencie contratos e renovações
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </motion.div>

      {/* Alert Banner */}
      {alertContracts.length > 0 && (
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
              {alertContracts.length} contrato{alertContracts.length > 1 ? "s" : ""} requer{alertContracts.length > 1 ? "em" : ""} atenção
            </p>
            <p className="text-sm text-muted-foreground">
              Verifique os contratos próximos da renovação ou em processo de renovação
            </p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar contratos..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="expiring_soon">Próx. vencimento</SelectItem>
            <SelectItem value="renewing">Em renovação</SelectItem>
            <SelectItem value="ended">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos os módulos</SelectItem>
            {allModules.map((mod) => (
              <SelectItem key={mod} value={mod}>
                {mod}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Contratos Ativos</p>
          <p className="text-2xl font-bold text-foreground">{activeContracts.length}</p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Receita Recorrente</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(activeContracts.reduce((acc, c) => acc + c.monthlyValue, 0))}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Em Renovação</p>
          <p className="text-2xl font-bold text-warning">
            {mockContracts.filter((c) => c.status === "renewing").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Próx. Vencimento</p>
          <p className="text-2xl font-bold text-warning">
            {mockContracts.filter((c) => c.status === "expiring_soon").length}
          </p>
        </div>
      </motion.div>

      {/* Contracts List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {filteredContracts.map((contract, index) => (
          <motion.div
            key={contract.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
            className={cn(
              "glass rounded-xl p-5 transition-all hover:shadow-lg",
              contract.status === "expiring_soon" && "border-warning/30",
              contract.status === "renewing" && "border-primary/30"
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-foreground">{contract.clientName}</h3>
                  <Badge variant="outline" className={cn(statusConfig[contract.status].color)}>
                    {statusConfig[contract.status].label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(contract.monthlyValue)}/mês</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Renova: {new Date(contract.renewalDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <span>Duração mín: {contract.minDuration} meses</span>
                </div>
                {contract.modules.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {contract.modules.map((module) => (
                      <Badge key={module} variant="secondary" className="text-xs">
                        {module}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {contract.daysUntilRenewal > 0 && contract.daysUntilRenewal <= 30 && (
                  <span className={cn(
                    "text-sm font-medium",
                    contract.daysUntilRenewal <= 7 ? "text-destructive" : "text-warning"
                  )}>
                    {contract.daysUntilRenewal} dias restantes
                  </span>
                )}
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredContracts.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-muted-foreground">Nenhum contrato encontrado</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
