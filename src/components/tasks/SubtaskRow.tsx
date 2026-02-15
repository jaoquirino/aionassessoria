import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, User, Pencil, Archive } from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import { PriorityPopover, DatePopover } from "./InlineFieldPopover";
import { MultiAssigneePopover } from "./MultiAssigneePopover";
import { StackedAvatars } from "./StackedAvatars";
import type { Task, TeamMember } from "@/types/tasks";
import { supabase } from "@/integrations/supabase/client";
import type { TaskAssignee } from "@/hooks/useTaskAssignees";

interface ClientModule {
  contractModuleId: string;
  moduleId: string;
  moduleName: string;
  primaryRole: string;
  defaultWeight: number;
  isRecurring: boolean;
}

interface SubtaskRowProps {
  sub: Task;
  parentId: string;
  teamMembers: TeamMember[];
  clientModules: ClientModule[];
  assignees: TaskAssignee[];
  onToggle: (subtaskId: string, parentTaskId: string, isDone: boolean) => void;
  onUpdate: (subtaskId: string, parentTaskId: string, updates: Partial<Task>) => void;
  onSetAssignees: (taskId: string, memberIds: string[]) => void;
  onEdit: (subtaskId: string) => void;
  onDelete: (subtaskId: string, parentTaskId: string) => void;
}

const priorityEmojis: Record<string, string> = { urgent: "🔴", high: "🟠", medium: "🟡", low: "🟢" };

export function SubtaskRow({
  sub,
  parentId,
  teamMembers,
  clientModules,
  assignees,
  onToggle,
  onUpdate,
  onSetAssignees,
  onEdit,
  onDelete,
}: SubtaskRowProps) {
  const subOverdue = sub.due_date && parseLocalDate(sub.due_date) < new Date() && sub.status !== "done";

  // Weight popover controlled state
  const [weightOpen, setWeightOpen] = useState(false);

  // Assignees from server
  const displayAssignees = assignees.map(a => a.team_member).filter(Boolean) as TeamMember[];

  // Deliverable type logic — use sub data directly (optimistically updated)
  const mod = clientModules.find(m => m.contractModuleId === sub.contract_module_id);
  const isDesign = mod?.moduleName?.toLowerCase().includes("design");

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
        sub.status === "done" && "bg-success/5 border-success/30",
        subOverdue && "border-destructive/50 bg-destructive/5"
      )}
      onClick={() => onEdit(sub.id)}
    >
      <Checkbox
        checked={sub.status === "done"}
        onCheckedChange={(checked) =>
          onToggle(sub.id, parentId, !!checked)
        }
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium",
          sub.status === "done" && "line-through text-muted-foreground"
        )}>
          {sub.title}
        </span>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {/* Priority */}
          <PriorityPopover
            currentPriority={(sub.priority as any) || "medium"}
            onSelect={(p) => {
              onUpdate(sub.id, parentId, { priority: p } as any);
            }}
          >
            <button type="button" onClick={(e) => e.stopPropagation()} className="inline-flex">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted", subOverdue && "border-destructive text-destructive")}>
                {priorityEmojis[sub.priority] || "🟡"} {sub.priority === "urgent" ? "Urgente" : sub.priority === "high" ? "Alta" : sub.priority === "medium" ? "Média" : "Baixa"}
              </Badge>
            </button>
          </PriorityPopover>

          {/* Weight */}
          <Popover open={weightOpen} onOpenChange={setWeightOpen}>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="inline-flex">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted">
                  Peso: {sub.weight}
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-2" align="start" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Peso</p>
              <div className="space-y-1">
                {[1, 2, 3, 4, 5].map(w => (
                  <button
                    key={w}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(sub.id, parentId, { weight: w } as any);
                      setWeightOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                      sub.weight === w && "bg-muted"
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Deliverable type (Design only) */}
          {isDesign && (
            <div onClick={(e) => e.stopPropagation()} className="inline-flex">
              <Select
                value={sub.deliverable_type || ""}
                onValueChange={(val) => {
                  onUpdate(sub.id, parentId, { deliverable_type: val } as any);
                }}
              >
                <SelectTrigger className="h-5 text-[10px] px-1.5 py-0 w-auto border-dashed gap-0.5 inline-flex">
                  <SelectValue placeholder="Tipo">
                    {sub.deliverable_type === "arte" ? "🎨 Arte" : sub.deliverable_type === "video" ? "🎬 Vídeo" : "Tipo"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arte" className="text-xs">🎨 Arte</SelectItem>
                  <SelectItem value="video" className="text-xs">🎬 Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Due date */}
          <DatePopover
            currentDate={sub.due_date ? parseLocalDate(sub.due_date) : new Date()}
            onSelect={(date) => {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, "0");
              const dd = String(date.getDate()).padStart(2, "0");
              onUpdate(sub.id, parentId, { due_date: `${yyyy}-${mm}-${dd}` } as any);
            }}
          >
            <button type="button" onClick={(e) => e.stopPropagation()} className="inline-flex">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted", subOverdue && "border-destructive text-destructive")}>
                <CalendarIcon className="h-2.5 w-2.5 mr-0.5" />
                {sub.due_date ? parseLocalDate(sub.due_date).toLocaleDateString("pt-BR") : "Sem prazo"}
              </Badge>
            </button>
          </DatePopover>

          {/* Module */}
          <div onClick={(e) => e.stopPropagation()} className="inline-flex">
            <Select
              value={sub.contract_module_id || ""}
              onValueChange={(val) => {
                const selectedMod = clientModules.find(m => m.contractModuleId === val);
                const selIsDesign = selectedMod?.moduleName?.toLowerCase().includes("design");
                // Optimistic update immediately
                onUpdate(sub.id, parentId, {
                  contract_module_id: val,
                  deliverable_type: selIsDesign ? (sub.deliverable_type || null) : null,
                } as any);
                // Fetch contract_id in background
                supabase.from("contract_modules").select("contract_id").eq("id", val).single().then(({ data: cmData }) => {
                  if (cmData?.contract_id) {
                    onUpdate(sub.id, parentId, { contract_id: cmData.contract_id } as any);
                  }
                });
              }}
            >
              <SelectTrigger className="h-5 text-[10px] px-1.5 py-0 w-auto border-dashed gap-0.5 inline-flex">
                <SelectValue placeholder="Módulo">
                  {clientModules.find(m => m.contractModuleId === sub.contract_module_id)?.moduleName || "Módulo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clientModules.map((module) => (
                  <SelectItem key={module.contractModuleId} value={module.contractModuleId} className="text-xs">
                    {module.moduleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-assignees */}
          <MultiAssigneePopover
            currentAssignees={displayAssignees}
            teamMembers={teamMembers}
            onSelect={(memberIds) => {
              onSetAssignees(sub.id, memberIds);
              onUpdate(sub.id, parentId, { assigned_to: memberIds[0] || null } as any);
            }}
          >
            <button type="button" onClick={(e) => e.stopPropagation()} className="inline-flex">
              {displayAssignees.length > 0 ? (
                <StackedAvatars assignees={displayAssignees} size="sm" />
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted">
                  <User className="h-2.5 w-2.5 mr-0.5" />
                  Sem resp.
                </Badge>
              )}
            </button>
          </MultiAssigneePopover>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Editar subtarefa"
          onClick={() => onEdit(sub.id)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
          title="Arquivar subtarefa"
          onClick={() => onDelete(sub.id, parentId)}
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
