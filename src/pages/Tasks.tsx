import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, AlertTriangle, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TaskKanbanBoard, Task, TaskStatus } from "@/components/tasks/TaskKanbanBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskFilters, TaskFiltersState } from "@/components/tasks/TaskFilters";

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Criar campanha Black Friday",
    client: "Loja Fashion",
    module: "Gestão de Tráfego",
    type: "project",
    assignee: "Ana Silva",
    assigneeRole: "Gestor de Tráfego",
    dueDate: "2024-01-15",
    status: "in_progress",
    weight: 4,
    isOverdue: true,
  },
  {
    id: "2",
    title: "Posts Instagram - Semana 3",
    client: "Restaurante Bella",
    module: "Design",
    type: "recurring",
    assignee: "Carlos Santos",
    assigneeRole: "Designer",
    dueDate: "2024-01-16",
    status: "review",
    weight: 2,
    isOverdue: false,
  },
  {
    id: "3",
    title: "Planejamento Mensal Fevereiro",
    client: "Tech Solutions",
    module: "",
    type: "planning",
    assignee: "Maria Costa",
    assigneeRole: "Copywriter",
    dueDate: "2024-01-31",
    status: "todo",
    weight: 1,
    isOverdue: false,
  },
  {
    id: "4",
    title: "Landing Page Promoção Verão",
    client: "Fit Academia",
    module: "Landing Pages",
    type: "extra",
    assignee: "João Mendes",
    assigneeRole: "Designer",
    dueDate: "2024-01-14",
    status: "in_progress",
    weight: 3,
    isOverdue: true,
  },
  {
    id: "5",
    title: "Textos para Blog - Janeiro",
    client: "Tech Solutions",
    module: "Copywriting",
    type: "recurring",
    assignee: "Maria Costa",
    assigneeRole: "Copywriter",
    dueDate: "2024-01-20",
    status: "todo",
    weight: 2,
    isOverdue: false,
  },
  {
    id: "6",
    title: "Identidade Visual Completa",
    client: "Nova Startup",
    module: "Identidade Visual",
    type: "project",
    assignee: "Carlos Santos",
    assigneeRole: "Designer",
    dueDate: "2024-01-25",
    status: "in_progress",
    weight: 4,
    isOverdue: false,
  },
  {
    id: "7",
    title: "Campanha de Natal finalizada",
    client: "Loja Fashion",
    module: "Gestão de Tráfego",
    type: "project",
    assignee: "Ana Silva",
    assigneeRole: "Gestor de Tráfego",
    dueDate: "2023-12-25",
    status: "done",
    weight: 4,
    isOverdue: false,
  },
  {
    id: "8",
    title: "Posts Instagram - Semana 2",
    client: "Restaurante Bella",
    module: "Design",
    type: "recurring",
    assignee: "Carlos Santos",
    assigneeRole: "Designer",
    dueDate: "2024-01-09",
    status: "done",
    weight: 2,
    isOverdue: false,
  },
];

const statusOptions = [
  { value: "todo", label: "A fazer" },
  { value: "in_progress", label: "Em produção" },
  { value: "review", label: "Revisão" },
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
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filters, setFilters] = useState<TaskFiltersState>({
    search: "",
    status: "all",
    type: "all",
    assignee: "all",
    client: "all",
  });

  const assigneeOptions = useMemo(() => {
    const unique = [...new Set(tasks.map((t) => t.assignee))];
    return unique.map((a) => ({ value: a, label: a }));
  }, [tasks]);

  const clientOptions = useMemo(() => {
    const unique = [...new Set(tasks.map((t) => t.client))];
    return unique.map((c) => ({ value: c, label: c }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.client.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.assignee.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesType = filters.type === "all" || task.type === filters.type;
      const matchesAssignee = filters.assignee === "all" || task.assignee === filters.assignee;
      const matchesClient = filters.client === "all" || task.client === filters.client;

      return matchesSearch && matchesStatus && matchesType && matchesAssignee && matchesClient;
    });
  }, [tasks, filters]);

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );
  };

  const overdueTasks = tasks.filter((t) => t.isOverdue);
  const totalWeight = tasks.filter((t) => t.status !== "done").reduce((acc, t) => acc + t.weight, 0);

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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </motion.div>

      {/* Overdue Alert */}
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

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
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
          <TaskKanbanBoard tasks={filteredTasks} onTaskMove={handleTaskMove} />
        ) : (
          <TaskListView tasks={filteredTasks} />
        )}
      </motion.div>
    </div>
  );
}
