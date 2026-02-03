import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search, MoreHorizontal } from "lucide-react";
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

interface Client {
  id: string;
  name: string;
  status: "active" | "paused" | "ended";
  contractsCount: number;
  monthlyRevenue: number;
  createdAt: string;
}

const mockClients: Client[] = [
  { id: "1", name: "Tech Solutions", status: "active", contractsCount: 2, monthlyRevenue: 5000, createdAt: "2023-06-15" },
  { id: "2", name: "Loja Fashion", status: "active", contractsCount: 1, monthlyRevenue: 3500, createdAt: "2023-08-20" },
  { id: "3", name: "Restaurante Bella", status: "active", contractsCount: 1, monthlyRevenue: 2800, createdAt: "2023-09-10" },
  { id: "4", name: "Fit Academia", status: "paused", contractsCount: 1, monthlyRevenue: 2200, createdAt: "2023-07-05" },
  { id: "5", name: "Clínica Saúde+", status: "active", contractsCount: 2, monthlyRevenue: 4500, createdAt: "2023-05-01" },
  { id: "6", name: "Auto Peças Silva", status: "ended", contractsCount: 0, monthlyRevenue: 0, createdAt: "2022-12-15" },
];

const statusConfig = {
  active: { label: "Ativo", color: "bg-success/20 text-success border-success/30" },
  paused: { label: "Pausado", color: "bg-warning/20 text-warning border-warning/30" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground border-muted" },
};

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredClients = useMemo(() => {
    return mockClients.filter((client) => {
      const matchesSearch =
        search === "" ||
        client.name.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
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
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Clientes Ativos</p>
          <p className="text-2xl font-bold text-foreground">
            {mockClients.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Receita Total</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(mockClients.reduce((acc, c) => acc + c.monthlyRevenue, 0))}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Contratos Ativos</p>
          <p className="text-2xl font-bold text-foreground">
            {mockClients.reduce((acc, c) => acc + c.contractsCount, 0)}
          </p>
        </div>
      </motion.div>

      {/* Client List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
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
                  Receita Mensal
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cliente Desde
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredClients.map((client, index) => (
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
                    {client.contractsCount}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {formatCurrency(client.monthlyRevenue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(client.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    <button className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
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
