import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, Loader2 } from "lucide-react";
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
import { useAllModules, useDeleteModule, type ServiceModule } from "@/hooks/useModules";
import { useAllModuleDeliverableTypes } from "@/hooks/useModuleDeliverableTypes";
import { ModuleDialog } from "@/components/modules/ModuleDialog";

interface ModuleWithStats extends ServiceModule {
  activeClients: number;
}

export default function Modules() {
  const [search, setSearch] = useState("");
  const [recurrenceFilter, setRecurrenceFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithStats | null>(null);
  const [deletingModule, setDeletingModule] = useState<ModuleWithStats | null>(null);

  const { data: modules = [], isLoading } = useAllModules();
  const { data: allDeliverableTypes = [] } = useAllModuleDeliverableTypes();
  const deleteModule = useDeleteModule();

  const allRoles = useMemo(() => {
    const roles = new Set(modules.map((m) => m.primary_role));
    return Array.from(roles).sort();
  }, [modules]);

  const filteredModules = useMemo(() => {
    return modules.filter((module) => {
      if (!module.is_active) return false;
      
      const matchesSearch =
        search === "" ||
        module.name.toLowerCase().includes(search.toLowerCase()) ||
        module.description?.toLowerCase().includes(search.toLowerCase());

      const matchesRecurrence =
        recurrenceFilter === "all" ||
        (recurrenceFilter === "recurring" && module.is_recurring) ||
        (recurrenceFilter === "one_time" && !module.is_recurring);

      const matchesRole = roleFilter === "all" || module.primary_role === roleFilter;

      return matchesSearch && matchesRecurrence && matchesRole;
    });
  }, [modules, search, recurrenceFilter, roleFilter]);

  const activeModules = modules.filter(m => m.is_active);

  const handleEdit = (module: ModuleWithStats) => {
    setEditingModule(module);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingModule) {
      await deleteModule.mutateAsync(deletingModule.id);
      setDeletingModule(null);
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
          <h1 className="text-2xl font-bold text-foreground">Módulos de Serviço</h1>
          <p className="text-muted-foreground">
            Configure os serviços oferecidos pela agência
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setEditingModule(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          Novo Módulo
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
            placeholder="Buscar módulos..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={recurrenceFilter} onValueChange={setRecurrenceFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue placeholder="Recorrência" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="recurring">Recorrente</SelectItem>
            <SelectItem value="one_time">Pontual</SelectItem>
          </SelectContent>
        </Select>
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
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total de Módulos</p>
          <p className="text-2xl font-bold text-foreground">{activeModules.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Recorrentes</p>
          <p className="text-2xl font-bold text-foreground">
            {activeModules.filter((m) => m.is_recurring).length}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Peso Médio</p>
          <p className="text-2xl font-bold text-foreground">
            {activeModules.length > 0 
              ? (activeModules.reduce((acc, m) => acc + m.default_weight, 0) / activeModules.length).toFixed(1)
              : "0"}
          </p>
        </div>
      </motion.div>

      {/* Modules Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filteredModules.map((module, index) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className="glass rounded-xl p-5 group transition-all hover:shadow-lg cursor-pointer"
            onClick={() => handleEdit(module as ModuleWithStats)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-foreground">{module.name}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleEdit(module as ModuleWithStats); }}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={(e) => { e.stopPropagation(); setDeletingModule(module as ModuleWithStats); }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {module.description || "Sem descrição"}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="border-primary/30 text-primary">
                Peso: {module.default_weight}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  module.is_recurring
                    ? "border-success/30 text-success"
                    : "border-muted text-muted-foreground"
                )}
              >
                {module.is_recurring ? "Recorrente" : "Pontual"}
              </Badge>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Função principal:</span>
                <span className="font-medium text-foreground">{module.primary_role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Clientes ativos:</span>
                <span className="font-medium text-foreground">{module.activeClients || 0}</span>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredModules.length === 0 && (
          <div className="col-span-full glass rounded-xl p-12 text-center">
            <p className="text-muted-foreground">
              {activeModules.length === 0 ? "Crie seu primeiro módulo de serviço" : "Nenhum módulo encontrado"}
            </p>
          </div>
        )}
      </motion.div>

      {/* Dialogs */}
      <ModuleDialog
        module={editingModule}
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingModule(null); }}
      />

      <AlertDialog open={!!deletingModule} onOpenChange={() => setDeletingModule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá o módulo "{deletingModule?.name}". Contratos que usam este módulo não serão afetados.
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
