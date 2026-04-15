import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Loader2 } from "lucide-react";
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
import { useAllTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { TeamMemberDialog } from "@/components/team/TeamMemberDialog";
import { TeamMemberTasksDialog } from "@/components/team/TeamMemberTasksDialog";
import { useRoleNames } from "@/hooks/useAvailableRoles";

interface TeamMemberWithStats extends TeamMember {
  currentWeight: number;
  activeTasks: number;
  overdueTasks: number;
}

function getCapacityStatus(current: number, max: number) {
  const percentage = (current / max) * 100;
  if (percentage > 100) return "critical";
  if (percentage >= 80) return "attention";
  return "normal";
}

export default function Team() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberWithStats | null>(null);
  const [tasksDialogMember, setTasksDialogMember] = useState<TeamMemberWithStats | null>(null);

  const { data: teamMembers = [], isLoading } = useAllTeamMembers();
  const roleOptions = useRoleNames();

  const filteredTeam = useMemo(() => {
    return teamMembers.filter((member) => {
      const matchesSearch =
        search === "" ||
        member.name.toLowerCase().includes(search.toLowerCase());

      const memberRoles = (member.role || "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const matchesRole =
        roleFilter === "all" ||
        memberRoles.some((r) => r.toLowerCase() === roleFilter.toLowerCase());

      const status = getCapacityStatus(member.currentWeight, member.capacity_limit);
      const matchesCapacity = capacityFilter === "all" || status === capacityFilter;

      return matchesSearch && matchesRole && matchesCapacity;
    });
  }, [teamMembers, search, roleFilter, capacityFilter]);

  const totalCapacity = teamMembers.reduce((acc, m) => acc + m.capacity_limit, 0);
  const usedCapacity = teamMembers.reduce((acc, m) => acc + m.currentWeight, 0);

  const handleViewTasks = (member: TeamMemberWithStats) => {
    setTasksDialogMember(member);
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
          <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
          <p className="text-muted-foreground">
            Gerenciamento de capacidade e carga
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => { setEditingMember(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Novo Integrante
          </Button>
        </div>
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
            <SelectValue placeholder="Cargos" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos os cargos</SelectItem>
            {roleOptions.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
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
      {teamMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Capacidade Total da Equipe</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Peso utilizado</span>
              <span className="font-medium text-foreground">
                {usedCapacity} / {totalCapacity}
              </span>
            </div>
            <Progress
              value={totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0}
              className={cn(
                "h-3",
                usedCapacity > totalCapacity
                  ? "[&>div]:bg-destructive"
                  : usedCapacity > totalCapacity * 0.8
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-success"
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
      )}

      {/* Team Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filteredTeam.map((member, index) => {
          const status = getCapacityStatus(member.currentWeight, member.capacity_limit);
          const percentage = Math.min((member.currentWeight / member.capacity_limit) * 100, 100);
          const memberRoles = (member.role || "").split(",").map(r => r.trim()).filter(Boolean);

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className={cn(
                "glass rounded-xl p-5 group transition-all hover:shadow-lg cursor-pointer flex flex-col h-full",
                status === "critical" && "border-destructive/30",
                status === "attention" && "border-warning/30"
              )}
              onClick={() => handleViewTasks(member)}
            >
              {/* Row 1: Avatar + Name + Roles */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{member.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {memberRoles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs border-muted text-muted-foreground">
                        {role}
                      </Badge>
                    ))}
                    {(member as any).employment_type === "freelancer" && (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        Freelancer
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Tasks summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
                <span>{member.activeTasks} tarefas ativas</span>
                {member.overdueTasks > 0 && (
                  <span className="text-destructive font-medium">
                    {member.overdueTasks} atrasada{member.overdueTasks > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Capacity - always at bottom */}
              <div className="space-y-2 mt-auto pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Carga</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("status-indicator", `status-${status}`)} />
                    <span className="font-medium text-foreground">
                      {member.currentWeight}/{member.capacity_limit}
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
            </motion.div>
          );
        })}
        {filteredTeam.length === 0 && (
          <div className="col-span-full glass rounded-xl p-12 text-center">
            <p className="text-muted-foreground">
              {teamMembers.length === 0 ? "Adicione seu primeiro integrante da equipe" : "Nenhum integrante encontrado"}
            </p>
          </div>
        )}
      </motion.div>

      {/* Dialogs */}
      <TeamMemberDialog
        member={editingMember}
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingMember(null); }}
      />

      <TeamMemberTasksDialog
        member={tasksDialogMember}
        open={!!tasksDialogMember}
        onOpenChange={(open) => { if (!open) setTasksDialogMember(null); }}
      />
    </div>
  );
}
