import { useState, useMemo, useEffect } from "react";
import { parseLocalDate } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, LayoutGrid, List, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { CollapsibleFilters, type FiltersState } from "@/components/tasks/CollapsibleFilters";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import { useTasks, useUpdateTaskStatus, useUpdateTaskField, useTeamMembers, useClients, useCreateTask, useArchiveTask } from "@/hooks/useTasks";
import type { TaskStatusDB } from "@/types/tasks";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

const statusOptions = [
  { value: "todo", label: "A fazer" },
  { value: "in_progress", label: "Em produção" },
  { value: "review", label: "Em revisão" },
  { value: "waiting_client", label: "Aguardando cliente" },
  { value: "done", label: "Entregue" },
];

const typeOptions = [
  { value: "recurring", label: "Entrega recorrente" },
  { value: "planning", label: "Planejamento" },
  { value: "extra", label: "Extra" },
];

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskTab, setSelectedTaskTab] = useState<string>("details");
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    status: "all",
    type: "all",
    assignee: "all",
    client: "all",
  });

  const { data: tasks = [], isLoading, isFetching } = useTasks();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: clients = [] } = useClients();
  const updateStatus = useUpdateTaskStatus();
  const updateField = useUpdateTaskField();
  const createTask = useCreateTask();
  const archiveTask = useArchiveTask();

  // Handle task opening from URL query param (e.g., from notifications)
  useEffect(() => {
    const taskIdFromUrl = searchParams.get("task");
    if (taskIdFromUrl) {
      setSelectedTaskId(taskIdFromUrl);
      // Remove query param after opening
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const assigneeOptions = useMemo(() => {
    return teamMembers.map((m) => ({ value: m.id, label: m.name }));
  }, [teamMembers]);

  const clientOptions = useMemo(() => {
    return clients.map((c) => ({ value: c.id, label: c.name }));
  }, [clients]);

  // Filter out project (onboarding) tasks from the base tasks for stats and display
  const operationalTasks = useMemo(() => {
    return tasks.filter(task => task.type !== "project" && task.type !== "onboarding");
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return operationalTasks.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.client?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.assignee?.name?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesType = filters.type === "all" || task.type === filters.type;
      const matchesAssignee = filters.assignee === "all" || task.assigned_to === filters.assignee;
      const matchesClient = filters.client === "all" || task.client_id === filters.client;

      return matchesSearch && matchesStatus && matchesType && matchesAssignee && matchesClient;
    });
  }, [operationalTasks, filters]);

  const handleTaskMove = (taskId: string, newStatus: TaskStatusDB) => {
    updateStatus.mutate({ taskId, status: newStatus });
  };

  const handleTaskClick = (taskId: string, initialTab?: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskTab(initialTab || "details");
  };

  // Quick create task - creates with no client pre-selected, opens edit modal
  const handleQuickAddTask = async (status: TaskStatusDB) => {
    if (clients.length === 0) {
      toast.error("Cadastre um cliente ativo primeiro");
      return;
    }

    try {
      const result = await createTask.mutateAsync({
        title: "Nova tarefa",
        client_id: clients[0].id, // Required by DB, user will change in modal
        type: "recurring",
        required_role: "Designer",
        due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        status,
      });

      // Open edit modal so user can select client and module
      if (result && result.id) {
        setTimeout(() => {
          setSelectedTaskId(result.id);
        }, 100);
      }
    } catch {
      // Error already handled by mutation
    }
  };
  // Handle inline field updates
  const handleUpdateField = (taskId: string, field: string, value: unknown) => {
    updateField.mutate({ taskId, field, value });
  };

  // Use operationalTasks for stats (excludes project/onboarding tasks)
  const overdueTasks = operationalTasks.filter((t) => parseLocalDate(t.due_date) < new Date() && t.status !== "done");
  const waitingClientTasks = operationalTasks.filter((t) => t.status === "waiting_client");
  const totalWeight = operationalTasks.filter((t) => t.status !== "done" && t.status !== "waiting_client").reduce((acc, t) => acc + t.weight, 0);

  // Show content immediately with cached data (no loading skeleton)
  const showContent = operationalTasks.length > 0 || !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground">Motor de entregas e produção</p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Atualizando...</span>
          )}
          <Button onClick={() => handleQuickAddTask("todo")} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Tarefa</span>
          </Button>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "kanban" | "list")}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem value="kanban" aria-label="Visualização Kanban" className="gap-1.5 data-[state=on]:bg-background">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Visualização Lista" className="gap-1.5 data-[state=on]:bg-background">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </motion.div>

      {/* Alerts */}
      {overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {overdueTasks.length} tarefa{overdueTasks.length > 1 ? "s" : ""} atrasada{overdueTasks.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Atenção imediata necessária para evitar impacto nos clientes
            </p>
          </div>
        </motion.div>
      )}

      {waitingClientTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 rounded-xl border border-info/30 bg-info/10 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/20">
            <Clock className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {waitingClientTasks.length} tarefa{waitingClientTasks.length > 1 ? "s" : ""} aguardando cliente
            </p>
            <p className="text-sm text-muted-foreground">
              Não contabilizadas como gargalo interno
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-5"
      >
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Total Ativas</p>
          <p className="text-2xl font-bold text-foreground">
            {operationalTasks.filter((t) => t.status !== "done").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 border-destructive/20 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Atrasadas</p>
          <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Em Revisão</p>
          <p className="text-2xl font-bold text-warning">
            {operationalTasks.filter((t) => t.status === "review").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Aguardando</p>
          <p className="text-2xl font-bold text-info">{waitingClientTasks.length}</p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Peso Total</p>
          <p className="text-2xl font-bold text-foreground">{totalWeight}</p>
        </div>
      </motion.div>

      {/* Tasks View with Integrated Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl p-4"
      >
        <div className="mb-4">
          <CollapsibleFilters
            filters={filters}
            onFiltersChange={setFilters}
            statusOptions={statusOptions}
            typeOptions={typeOptions}
            assigneeOptions={assigneeOptions}
            clientOptions={clientOptions}
          />
        </div>
        {showContent && (
          viewMode === "kanban" ? (
            <TaskKanbanBoard 
              tasks={filteredTasks} 
              onTaskMove={handleTaskMove} 
              onTaskClick={handleTaskClick}
              onAddTask={handleQuickAddTask}
              onUpdateField={handleUpdateField}
              onArchiveTask={(taskId) => archiveTask.mutate(taskId)}
              onUpdateStatus={(taskId, status) => updateStatus.mutate({ taskId, status })}
              teamMembers={teamMembers}
              clients={clients}
            />
          ) : (
            <TaskListView 
              tasks={filteredTasks} 
              onTaskClick={handleTaskClick}
              onUpdateField={handleUpdateField}
              onUpdateStatus={(taskId, status) => updateStatus.mutate({ taskId, status })}
              teamMembers={teamMembers}
              clients={clients}
            />
          )
        )}
      </motion.div>

      {/* Edit Dialog */}
      <TaskEditDialog 
        taskId={selectedTaskId} 
        open={!!selectedTaskId} 
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        initialTab={selectedTaskTab}
      />
    </div>
  );
}
