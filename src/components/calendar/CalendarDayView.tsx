import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarItem } from "./CalendarDayCell";
import { useMemo } from "react";

interface CalendarDayViewProps {
  currentDate: Date;
  itemsByDate: Record<string, CalendarItem[]>;
  onItemClick?: (item: CalendarItem) => void;
  clients?: { id: string; name: string; color: string | null; logo_url: string | null }[];
}

export function CalendarDayView({ currentDate, itemsByDate, onItemClick, clients = [] }: CalendarDayViewProps) {
  const key = currentDate.toISOString().split("T")[0];
  const items = itemsByDate[key] || [];

  const clientColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { if (c.color) map[c.name] = c.color; });
    return map;
  }, [clients]);

  const clientLogoMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { if (c.logo_url) map[c.name] = c.logo_url; });
    return map;
  }, [clients]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className={cn(
        "text-center py-4 border-b border-border",
        isToday(currentDate) && "bg-primary/10"
      )}>
        <div className="text-sm font-medium text-muted-foreground uppercase">
          {format(currentDate, "EEEE", { locale: ptBR })}
        </div>
        <div className={cn(
          "text-3xl font-bold mt-1 inline-flex items-center justify-center w-12 h-12 rounded-full",
          isToday(currentDate) && "bg-primary text-primary-foreground"
        )}>
          {format(currentDate, "d")}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Items */}
      <div className="p-4 min-h-[400px]">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhum item neste dia.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const clientColor = item.clientName ? clientColorMap[item.clientName] : null;
              const clientLogo = item.clientName ? clientLogoMap[item.clientName] : null;
              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className="rounded-lg px-4 py-3 border cursor-pointer hover:shadow-md transition-all"
                  style={clientColor ? {
                    backgroundColor: `${clientColor}15`,
                    borderColor: `${clientColor}30`,
                  } : undefined}
                >
                  <div className="flex items-center gap-3">
                    {clientLogo && (
                      <img src={clientLogo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-block w-2 h-2 rounded-full flex-shrink-0",
                          item.type === "task" ? "bg-primary" : "bg-info"
                        )} />
                        <span className="font-medium text-sm truncate">{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                          {item.type === "task" ? "Tarefa" : "Editorial"}
                        </span>
                      </div>
                      {item.clientName && (
                        <div className="text-xs text-muted-foreground mt-0.5 ml-4">{item.clientName}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
