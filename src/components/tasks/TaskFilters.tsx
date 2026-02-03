import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TaskFiltersState {
  search: string;
  status: string;
  type: string;
  assignee: string;
  client: string;
}

interface TaskFiltersProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  statusOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  assigneeOptions: { value: string; label: string }[];
  clientOptions: { value: string; label: string }[];
}

export function TaskFilters({
  filters,
  onFiltersChange,
  statusOptions,
  typeOptions,
  assigneeOptions,
  clientOptions,
}: TaskFiltersProps) {
  const updateFilter = (key: keyof TaskFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      type: "all",
      assignee: "all",
      client: "all",
    });
  };

  const activeFiltersCount = [
    filters.status !== "all",
    filters.type !== "all",
    filters.assignee !== "all",
    filters.client !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>

        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => updateFilter("type", v)}>
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos os tipos</SelectItem>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.assignee} onValueChange={(v) => updateFilter("assignee", v)}>
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos</SelectItem>
            {assigneeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.client} onValueChange={(v) => updateFilter("client", v)}>
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          <Badge variant="secondary">{activeFiltersCount}</Badge>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-7">
            <X className="h-3 w-3" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
