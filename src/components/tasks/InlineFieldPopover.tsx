import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TeamMember, TaskPriority } from "@/types/tasks";
import { priorityConfig, roleOptions } from "@/types/tasks";

interface InlineFieldPopoverProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

// Assignee Popover
interface AssigneePopoverProps extends InlineFieldPopoverProps {
  currentAssignee?: TeamMember | null;
  teamMembers: TeamMember[];
  onSelect: (memberId: string | null) => void;
  isUpdating?: boolean;
}

export function AssigneePopover({ 
  children, 
  currentAssignee, 
  teamMembers, 
  onSelect, 
  isUpdating,
  disabled 
}: AssigneePopoverProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (memberId: string) => {
    onSelect(memberId === "unassigned" ? null : memberId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Responsável</p>
          <button
            onClick={() => handleSelect("unassigned")}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
              !currentAssignee && "bg-muted"
            )}
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Não atribuído</span>
          </button>
          {teamMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => handleSelect(member.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                currentAssignee?.id === member.id && "bg-muted"
              )}
            >
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="truncate">{member.name}</span>
            </button>
          ))}
        </div>
        {isUpdating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
            <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Date Popover
interface DatePopoverProps extends InlineFieldPopoverProps {
  currentDate: Date;
  onSelect: (date: Date) => void;
  isUpdating?: boolean;
}

export function DatePopover({ 
  children, 
  currentDate, 
  onSelect, 
  isUpdating,
  disabled 
}: DatePopoverProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onSelect(date);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={handleSelect}
          locale={ptBR}
          className="p-3 pointer-events-auto"
        />
        {isUpdating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
            <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Role Popover
interface RolePopoverProps extends InlineFieldPopoverProps {
  currentRole: string;
  onSelect: (role: string) => void;
  isUpdating?: boolean;
}

export function RolePopover({ 
  children, 
  currentRole, 
  onSelect, 
  isUpdating,
  disabled 
}: RolePopoverProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (role: string) => {
    onSelect(role);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Função</p>
          {roleOptions.map((role) => (
            <button
              key={role}
              onClick={() => handleSelect(role)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                currentRole === role && "bg-muted"
              )}
            >
              {role}
            </button>
          ))}
        </div>
        {isUpdating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
            <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Priority Popover
interface PriorityPopoverProps extends InlineFieldPopoverProps {
  currentPriority: TaskPriority;
  onSelect: (priority: TaskPriority) => void;
  isUpdating?: boolean;
}

export function PriorityPopover({ 
  children, 
  currentPriority, 
  onSelect, 
  isUpdating,
  disabled 
}: PriorityPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (priority: TaskPriority) => {
    onSelect(priority);
    setOpen(false);
  };

  const priorities: TaskPriority[] = ["urgent", "high", "medium", "low"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Prioridade</p>
          {priorities.map((priority) => {
            const config = priorityConfig[priority];
            return (
              <button
                key={priority}
                onClick={() => handleSelect(priority)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                  currentPriority === priority && "bg-muted"
                )}
              >
                <Badge className={cn("text-xs", config.color)}>{config.label}</Badge>
              </button>
            );
          })}
        </div>
        {isUpdating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
            <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
