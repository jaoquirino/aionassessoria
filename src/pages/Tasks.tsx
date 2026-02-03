import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, AlertTriangle, LayoutGrid, List, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskFilters, TaskFiltersState } from "@/components/tasks/TaskFilters";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import { useTasks, useUpdateTaskStatus, useTeamMembers, useClients } from "@/hooks/useTasks";
import type { TaskStatusDB } from "@/types/tasks";

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
  { value: "project", label: "Projeto" },
  { value: "extra", label: "Extra" },
];

export default function Tasks() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFiltersState>({
    search: "",
    status: "all",
    type: "all",
    assignee: "all",
    client: "all",
  });

  const { data: tasks = [], isLoading } = useTasks();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: clients = [] } = useClients();
  const updateStatus = useUpdateTaskStatus();

  const assigneeOptions = useMemo(() => {
    return teamMembers.map((m) => ({ value: m.id, label: m.name }));
  }, [teamMembers]);

  const clientOptions = useMemo(() => {
    return clients.map((c) => ({ value: c.id, label: c.name }));
  }, [clients]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
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
  }, [tasks, filters]);

  const handleTaskMove = (taskId: string, newStatus: TaskStatusDB) => {
    updateStatus.mutate({ taskId, status: newStatus });
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const overdueTasks = tasks.filter((t) => new Date(t.due_date) < new Date() && t.status !== "done");
  const waitingClientTasks = tasks.filter((t) => t.status === "waiting_client");
  const totalWeight = tasks.filter((t) => t.status !== "done" && t.status !== "waiting_client").reduce((acc, t) => acc + t.weight, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[500px] w-[280px]" />
          ))}
        </div>
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
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground">Motor de entregas e produção</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
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
          className="flex items-center gap-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
            <Clock className="h-5 w-5 text-blue-500" />
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
            {tasks.filter((t) => t.status !== "done").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 border-destructive/20 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Atrasadas</p>
          <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Em Revisão</p>
          <p className="text-2xl font-bold text-warning">
            {tasks.filter((t) => t.status === "review").length}
          </p>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground">Aguardando</p>
          <p className="text-2xl font-bold text-blue-500">{waitingClientTasks.length}</p>
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
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            statusOptions={statusOptions}
            typeOptions={typeOptions}
            assigneeOptions={assigneeOptions}
            clientOptions={clientOptions}
          />
        </div>
        {viewMode === "kanban" ? (
          <TaskKanbanBoard 
            tasks={filteredTasks} 
            onTaskMove={handleTaskMove} 
            onTaskClick={handleTaskClick}
          />
        ) : (
          <TaskListView 
            tasks={filteredTasks} 
            onTaskClick={handleTaskClick}
          />
        )}
      </motion.div>

      {/* Dialogs */}
      <AddTaskDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <TaskEditDialog 
        taskId={selectedTaskId} 
        open={!!selectedTaskId} 
        onOpenChange={(open) => !open && setSelectedTaskId(null)} 
      />
    </div>
  );
}
