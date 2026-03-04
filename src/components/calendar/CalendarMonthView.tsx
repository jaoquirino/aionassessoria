import { useMemo } from "react";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarItem } from "./CalendarDayCell";

interface CalendarMonthViewProps {
  currentMonth: Date;
  itemsByDate: Record<string, CalendarItem[]>;
  onDayClick: (date: Date) => void;
  clients?: { id: string; name: string; color: string | null; logo_url: string | null }[];
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarMonthView({ currentMonth, itemsByDate, onDayClick, clients = [] }: CalendarMonthViewProps) {
  const weeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const result: Date[][] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [currentMonth]);

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

  const socialColors: Record<string, string> = {
    instagram: "#E1306C",
    facebook: "#1877F2",
    tiktok: "#69C9D0",
    linkedin: "#0A66C2",
    youtube: "#FF0000",
    twitter: "#1DA1F2",
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 border-b border-border">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {weeks.flat().map((date) => {
          const key = date.toISOString().split("T")[0];
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isTodayDate = isToday(date);
          const items = itemsByDate[key] || [];
          const maxVisible = 3;
          const visible = items.slice(0, maxVisible);
          const remaining = items.length - maxVisible;

          return (
            <button
              key={key}
              onClick={() => onDayClick(date)}
              className={cn(
                "min-h-[100px] md:min-h-[120px] border border-border/50 p-1.5 text-left transition-colors hover:bg-accent/50 flex flex-col",
                !isCurrentMonth && "opacity-40",
                isTodayDate && "ring-2 ring-primary/50 bg-primary/5"
              )}
            >
              <span className={cn(
                "text-xs font-medium mb-1 inline-flex items-center justify-center h-6 w-6 rounded-full",
                isTodayDate && "bg-primary text-primary-foreground"
              )}>
                {date.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                {visible.map((item) => {
                  const clientColor = item.clientName ? clientColorMap[item.clientName] : null;
                  const clientLogo = item.clientName ? clientLogoMap[item.clientName] : null;
                  const editorialColor = item.type === "editorial" && item.socialNetwork
                    ? socialColors[item.socialNetwork] : null;
                  const displayColor = clientColor || editorialColor;

                  return (
                    <div
                      key={item.id}
                      className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate border flex items-center gap-1"
                      style={displayColor ? {
                        backgroundColor: `${displayColor}20`,
                        borderColor: `${displayColor}40`,
                        color: displayColor,
                      } : undefined}
                      title={item.title}
                    >
                      {clientLogo && (
                        <img src={clientLogo} alt="" className="w-3 h-3 rounded-full object-cover flex-shrink-0" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                  );
                })}
                {remaining > 0 && (
                  <span className="text-[10px] text-muted-foreground px-1">+{remaining} mais</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
