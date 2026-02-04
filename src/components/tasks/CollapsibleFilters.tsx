import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface FiltersState {
  search: string;
  status: string;
  type: string;
  assignee: string;
  client: string;
}

interface CollapsibleFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  statusOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  assigneeOptions: { value: string; label: string }[];
  clientOptions: { value: string; label: string }[];
}

export function CollapsibleFilters({
  filters,
  onFiltersChange,
  statusOptions,
  typeOptions,
  assigneeOptions,
  clientOptions,
}: CollapsibleFiltersProps) {
  const [open, setOpen] = useState(false);

  const updateFilter = (key: keyof FiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: filters.search,
      status: "all",
      type: "all",
      assignee: "all",
      client: "all",
    });
    setOpen(false);
  };

  const activeFiltersCount = [
    filters.status !== "all",
    filters.type !== "all",
    filters.assignee !== "all",
    filters.client !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          className="pl-9"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative shrink-0">
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Filtros</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs">
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Tipo</label>
                <Select value={filters.type} onValueChange={(v) => updateFilter("type", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Responsável</label>
                <Select value={filters.assignee} onValueChange={(v) => updateFilter("assignee", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {assigneeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Cliente</label>
                <Select value={filters.client} onValueChange={(v) => updateFilter("client", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
