import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  permission: "admin" | "operational";
  avatar?: string;
  currentWeight: number;
  maxWeight: number;
  activeTasks: number;
  overdueTasks: number;
}

const mockTeam: TeamMember[] = [
  {
    id: "1",
    name: "Ana Silva",
    email: "ana@agencia.com",
    role: "Designer",
    permission: "operational",
    currentWeight: 14,
    maxWeight: 15,
    activeTasks: 5,
    overdueTasks: 1,
  },
  {
    id: "2",
    name: "Carlos Santos",
    email: "carlos@agencia.com",
    role: "Gestor de Tráfego",
    permission: "admin",
    currentWeight: 18,
    maxWeight: 15,
    activeTasks: 7,
    overdueTasks: 2,
  },
  {
    id: "3",
    name: "Maria Costa",
    email: "maria@agencia.com",
    role: "Copywriter",
    permission: "operational",
    currentWeight: 8,
    maxWeight: 15,
    activeTasks: 4,
    overdueTasks: 0,
  },
  {
    id: "4",
    name: "João Mendes",
    email: "joao@agencia.com",
    role: "Designer",
    permission: "operational",
    currentWeight: 12,
    maxWeight: 15,
    activeTasks: 4,
    overdueTasks: 1,
  },
  {
    id: "5",
    name: "Paula Ribeiro",
    email: "paula@agencia.com",
    role: "Comercial",
    permission: "admin",
    currentWeight: 6,
    maxWeight: 10,
    activeTasks: 3,
    overdueTasks: 0,
  },
];

function getCapacityStatus(current: number, max: number) {
  const percentage = (current / max) * 100;
  if (percentage > 100) return "critical";
  if (percentage >= 80) return "attention";
  return "normal";
}

export default function Team() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [permissionFilter, setPermissionFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");

  const allRoles = useMemo(() => {
    const roles = new Set(mockTeam.map((m) => m.role));
    return Array.from(roles).sort();
  }, []);

  const filteredTeam = useMemo(() => {
    return mockTeam.filter((member) => {
      const matchesSearch =
        search === "" ||
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesPermission = permissionFilter === "all" || member.permission === permissionFilter;

      const status = getCapacityStatus(member.currentWeight, member.maxWeight);
      const matchesCapacity = capacityFilter === "all" || status === capacityFilter;

      return matchesSearch && matchesRole && matchesPermission && matchesCapacity;
    });
  }, [search, roleFilter, permissionFilter, capacityFilter]);

  const totalCapacity = mockTeam.reduce((acc, m) => acc + m.maxWeight, 0);
  const usedCapacity = mockTeam.reduce((acc, m) => acc + m.currentWeight, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
          <p className="text-muted-foreground">
            Gerenciamento de capacidade e carga
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Membro
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
            placeholder="Buscar membros..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todas as funções</SelectItem>
            {allRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={permissionFilter} onValueChange={setPermissionFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-background">
            <SelectValue placeholder="Permissão" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="operational">Operacional</SelectItem>
          </SelectContent>
        </Select>
        <Select value={capacityFilter} onValueChange={setCapacityFilter}>
          <SelectTrigger className="w-full sm:w-[150px] bg-background">
            <SelectValue placeholder="Capacidade" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="attention">Atenção</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Capacity Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="font-semibold text-foreground mb-4">Capacidade Total da Agência</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Peso utilizado</span>
            <span className="font-medium text-foreground">
              {usedCapacity} / {totalCapacity}
            </span>
          </div>
          <Progress
            value={(usedCapacity / totalCapacity) * 100}
            className={cn(
              "h-3",
              usedCapacity > totalCapacity && "[&>div]:bg-destructive",
              usedCapacity > totalCapacity * 0.8 && usedCapacity <= totalCapacity && "[&>div]:bg-warning"
            )}
          />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="status-indicator status-normal" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-indicator status-attention" />
              <span>Atenção ({">"}80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-indicator status-critical" />
              <span>Crítico ({">"}100%)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Team Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filteredTeam.map((member, index) => {
          const status = getCapacityStatus(member.currentWeight, member.maxWeight);
          const percentage = Math.min((member.currentWeight / member.maxWeight) * 100, 100);

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className={cn(
                "glass rounded-xl p-5 group transition-all hover:shadow-lg",
                status === "critical" && "border-destructive/30",
                status === "attention" && "border-warning/30"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <button className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      member.permission === "admin"
                        ? "border-primary/30 text-primary"
                        : "border-muted text-muted-foreground"
                    )}
                  >
                    {member.permission === "admin" ? "Admin" : "Operacional"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Carga</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("status-indicator", `status-${status}`)} />
                      <span className="font-medium text-foreground">
                        {member.currentWeight}/{member.maxWeight}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    className={cn(
                      "h-2",
                      status === "critical" && "[&>div]:bg-destructive",
                      status === "attention" && "[&>div]:bg-warning",
                      status === "normal" && "[&>div]:bg-success"
                    )}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{member.activeTasks} tarefas ativas</span>
                  {member.overdueTasks > 0 && (
                    <span className="text-destructive font-medium">
                      {member.overdueTasks} atrasada{member.overdueTasks > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {filteredTeam.length === 0 && (
          <div className="col-span-full glass rounded-xl p-12 text-center">
            <p className="text-muted-foreground">Nenhum membro encontrado</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
