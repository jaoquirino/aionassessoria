import { useMemo } from "react";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarItem } from "./CalendarDayCell";

interface CalendarWeekViewProps {
  currentDate: Date;
  itemsByDate: Record<string, CalendarItem[]>;
  onDayClick: (date: Date) => void;
  onItemClick?: (item: CalendarItem) => void;
  clients?: { id: string; name: string; color: string | null; logo_url: string | null }[];
}

export function CalendarWeekView({ currentDate, itemsByDate, onDayClick, onItemClick, clients = [] }: CalendarWeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

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
    <div className="flex flex-col border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={cn(
              "text-center py-3 border-r border-border last:border-r-0 hover:bg-accent/30 transition-colors",
              isToday(day) && "bg-primary/10"
            )}
          >
            <div className="text-[10px] font-medium text-muted-foreground uppercase">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div
              className={cn(
                "text-lg font-semibold mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-7 min-h-[500px]">
        {weekDays.map((day) => {
          const key = day.toISOString().split("T")[0];
          const items = itemsByDate[key] || [];
          return (
            <div
              key={key}
              className={cn(
                "border-r border-border last:border-r-0 p-1.5",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className="space-y-1">
                {items.map((item) => {
                  const clientColor = item.clientName ? clientColorMap[item.clientName] : null;
                  const clientLogo = item.clientName ? clientLogoMap[item.clientName] : null;
                  return (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick?.(item);
                      }}
                      className="w-full text-left rounded-md px-2 py-1.5 text-xs font-medium border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:brightness-95"
                      style={clientColor ? {
                        backgroundColor: `${clientColor}20`,
                        borderColor: `${clientColor}40`,
                        color: clientColor,
                      } : undefined}
                      title={`${item.title}${item.clientName ? ` • ${item.clientName}` : ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {clientLogo && (
                          <img src={clientLogo} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                        )}
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.clientName && !clientLogo && (
                        <div className="text-[10px] opacity-70 truncate mt-0.5">{item.clientName}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
