import { Badge } from "@/components/ui/badge";
import { usePriorities } from "@/hooks/usePriorities";
import { priorityConfig, type TaskPriority } from "@/types/tasks";

const fallbackColors: Record<string, string> = {
  low: "#10B981",
  medium: "#3B82F6",
  high: "#F59E0B",
  urgent: "#EF4444",
};

export function PriorityBadge({ priorityKey, className }: { priorityKey: string; className?: string }) {
  const { data: priorities } = usePriorities();
  
  const dbPriority = priorities?.find(p => p.key === priorityKey);
  
  if (dbPriority) {
    return (
      <Badge
        className={className}
        style={{
          backgroundColor: `${dbPriority.color}40`,
          color: dbPriority.color,
          borderColor: `${dbPriority.color}60`,
        }}
      >
        {dbPriority.label}
      </Badge>
    );
  }

  // Fallback to hardcoded
  const fallback = priorityConfig[priorityKey as TaskPriority];
  const hex = fallbackColors[priorityKey] || "#3B82F6";
  
  return (
    <Badge
      className={className}
      style={{
        backgroundColor: `${hex}40`,
        color: hex,
        borderColor: `${hex}60`,
      }}
    >
      {fallback?.label || priorityKey}
    </Badge>
  );
}
