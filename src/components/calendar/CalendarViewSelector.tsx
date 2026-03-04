import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarView = "day" | "week" | "month" | "year";

interface CalendarViewSelectorProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const views: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

export function CalendarViewSelector({ view, onViewChange }: CalendarViewSelectorProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
      {views.map((v) => (
        <Button
          key={v.value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-xs font-medium rounded-md transition-all",
            view === v.value
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onViewChange(v.value)}
        >
          {v.label}
        </Button>
      ))}
    </div>
  );
}
