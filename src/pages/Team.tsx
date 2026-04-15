import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Loader2, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAllTeamMembers, useDeleteTeamMember, type TeamMember } from "@/hooks/useTeamMembers";
import { TeamMemberDialog } from "@/components/team/TeamMemberDialog";
import { TeamMemberTasksDialog } from "@/components/team/TeamMemberTasksDialog";
import { FreelancerRatesDialog } from "@/components/team/FreelancerRatesDialog";
import { DollarSign } from "lucide-react";
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
  const [deletingMember, setDeletingMember] = useState<TeamMemberWithStats | null>(null);
  const [tasksDialogMember, setTasksDialogMember] = useState<TeamMemberWithStats | null>(null);
  const [ratesMember, setRatesMember] = useState<TeamMemberWithStats | null>(null);
  

  const { data: teamMembers = [], isLoading } = useAllTeamMembers();
  const deleteMember = useDeleteTeamMember();
  const roleOptions = useRoleNames();

  const allRoles = useMemo(() => {
    // Coleta cargos reais atribuídos aos membros
    const assignedRoles = new Set<string>();
    teamMembers.forEach((m) => {
      const raw = (m.role || "").split(",").map((r) => r.trim()).filter(Boolean);
      raw.forEach((r) => {
        // Só inclui se for um dos cargos válidos
        if (roleOptions.some(opt => opt.toLowerCase() === r.toLowerCase())) {
          assignedRoles.add(r);
        }
      });
    });
    return Array.from(assignedRoles).sort();
  }, [teamMembers]);

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

  const handleEdit = (member: TeamMemberWithStats) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleViewTasks = (member: TeamMemberWithStats) => {
    setTasksDialogMember(member);
  };

  const handleDelete = async () => {
    if (deletingMember) {
      await deleteMember.mutateAsync(deletingMember.id);
      setDeletingMember(null);
    }
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
          <Button variant="outline" className="gap-2" onClick={() => setPaymentDialogOpen(true)}>
            <DollarSign className="h-4 w-4" />
            Pagamentos
          </Button>
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
              {/* Row 1: Avatar + Name + Permission + Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                      {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{member.name}</h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs mt-0.5",
                        member.permission === "admin"
                          ? "border-primary/30 text-primary"
                          : "border-muted text-muted-foreground"
                      )}
                    >
                      {member.permission === "admin" ? "Admin" : "Operacional"}
                    </Badge>
                    {(member as any).employment_type === "freelancer" && (
                      <Badge variant="outline" className="text-xs mt-0.5 border-primary/30 text-primary">
                        Freelancer
                      </Badge>
                    )}
                    {(member as any).restricted_view && (
                      <Badge variant="outline" className="text-xs mt-0.5 border-warning/30 text-warning">
                        Visão restrita
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {(member as any).employment_type === "freelancer" && (
                    <button
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={(e) => { e.stopPropagation(); setRatesMember(member); }}
                      title="Valores por produção"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                    title="Editar"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button 
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={(e) => { e.stopPropagation(); setDeletingMember(member); }}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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

      <FreelancerRatesDialog
        member={ratesMember}
        open={!!ratesMember}
        onOpenChange={(open) => { if (!open) setRatesMember(null); }}
      />

      <PaymentPeriodsDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />

      <AlertDialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover integrante da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMember?.name} será movido para "Sem acesso" e não aparecerá mais na equipe. 
              As tarefas atribuídas não serão excluídas. Você pode restaurar o acesso nas Configurações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
