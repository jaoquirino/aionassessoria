import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CalendarFiltersProps {
  clientFilter: string;
  onClientFilterChange: (v: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  clients: { id: string; name: string }[];
  teamMembers: { id: string; name: string }[];
  onNewPost: () => void;
}

export function CalendarFilters({
  clientFilter, onClientFilterChange,
  assigneeFilter, onAssigneeFilterChange,
  typeFilter, onTypeFilterChange,
  clients, teamMembers, onNewPost,
}: CalendarFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={clientFilter} onValueChange={onClientFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clients.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={assigneeFilter} onValueChange={onAssigneeFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os responsáveis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os responsáveis</SelectItem>
          {teamMembers.map(m => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="tasks">Tarefas</SelectItem>
          <SelectItem value="editorial">Calendário Editorial</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1" />

      <Button onClick={onNewPost} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Nova Postagem
      </Button>
    </div>
  );
}
