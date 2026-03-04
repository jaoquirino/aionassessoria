import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface CalendarItem {
  id: string;
  title: string;
  type: "task" | "editorial";
  status?: string;
  socialNetwork?: string;
  clientName?: string;
}

interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
  onDayClick: (date: Date) => void;
}

const socialColors: Record<string, string> = {
  instagram: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
  facebook: "bg-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-600/30",
  tiktok: "bg-gray-800/20 text-gray-700 dark:text-gray-300 border-gray-500/30",
  linkedin: "bg-sky-600/20 text-sky-700 dark:text-sky-300 border-sky-600/30",
  youtube: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  twitter: "bg-sky-400/20 text-sky-700 dark:text-sky-300 border-sky-400/30",
};

export function CalendarDayCell({ date, isCurrentMonth, isToday, items, onDayClick }: CalendarDayCellProps) {
  const maxVisible = 3;
  const visible = items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <button
      onClick={() => onDayClick(date)}
      className={cn(
        "min-h-[100px] md:min-h-[120px] border border-border/50 p-1.5 text-left transition-colors hover:bg-accent/50 rounded-md flex flex-col",
        !isCurrentMonth && "opacity-40",
        isToday && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      <span className={cn(
        "text-xs font-medium mb-1 inline-flex items-center justify-center h-6 w-6 rounded-full",
        isToday && "bg-primary text-primary-foreground"
      )}>
        {date.getDate()}
      </span>
      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
        {visible.map(item => (
          <div
            key={item.id}
            className={cn(
              "text-[10px] leading-tight px-1.5 py-0.5 rounded truncate border",
              item.type === "task"
                ? "bg-primary/10 text-primary border-primary/20"
                : socialColors[item.socialNetwork || ""] || "bg-accent text-accent-foreground border-accent"
            )}
          >
            {item.title}
          </div>
        ))}
        {remaining > 0 && (
          <span className="text-[10px] text-muted-foreground px-1">+{remaining} mais</span>
        )}
      </div>
    </button>
  );
}
