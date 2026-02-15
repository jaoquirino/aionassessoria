import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types/tasks";

interface MultiAssigneePopoverProps {
  children: React.ReactNode;
  currentAssignees: TeamMember[];
  teamMembers: TeamMember[];
  onSelect: (memberIds: string[]) => void;
  disabled?: boolean;
}

export function MultiAssigneePopover({ 
  children, 
  currentAssignees, 
  teamMembers, 
  onSelect, 
  disabled 
}: MultiAssigneePopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    currentAssignees.map(a => a.id)
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedIds(currentAssignees.map(a => a.id));
    } else {
      // Save on close only if changed
      const currentSorted = [...currentAssignees.map(a => a.id)].sort().join(",");
      const selectedSorted = [...selectedIds].sort().join(",");
      if (currentSorted !== selectedSorted) {
        onSelect(selectedIds);
      }
    }
    setOpen(newOpen);
  };

  const toggleMember = (memberId: string) => {
    setSelectedIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger 
        asChild 
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Responsáveis</p>
          {teamMembers.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            return (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                  isSelected && "bg-primary/10"
                )}
              >
                <Checkbox 
                  checked={isSelected} 
                  className="pointer-events-none"
                />
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
            );
          })}
          {teamMembers.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">Nenhum membro disponível</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
