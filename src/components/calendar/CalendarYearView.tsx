import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarItem } from "./CalendarDayCell";

interface CalendarYearViewProps {
  currentYear: number;
  itemsByDate: Record<string, CalendarItem[]>;
  onMonthClick: (date: Date) => void;
}

export function CalendarYearView({ currentYear, itemsByDate, onMonthClick }: CalendarYearViewProps) {
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));
  }, [currentYear]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map((month) => (
        <MiniMonth
          key={month.getMonth()}
          month={month}
          itemsByDate={itemsByDate}
          onClick={() => onMonthClick(month)}
        />
      ))}
    </div>
  );
}

function MiniMonth({ month, itemsByDate, onClick }: {
  month: Date;
  itemsByDate: Record<string, CalendarItem[]>;
  onClick: () => void;
}) {
  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const allDays = eachDayOfInterval({ start, end });
    const startPadding = getDay(start);
    return { allDays, startPadding };
  }, [month]);

  const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div
      onClick={onClick}
      className="border border-border rounded-lg p-3 cursor-pointer hover:bg-accent/30 hover:shadow-sm transition-all"
    >
      <div className="text-sm font-semibold text-center mb-2 capitalize">
        {format(month, "MMMM", { locale: ptBR })}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground font-medium pb-1">
            {d}
          </div>
        ))}
        {Array.from({ length: days.startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.allDays.map((day) => {
          const key = day.toISOString().split("T")[0];
          const hasItems = (itemsByDate[key]?.length || 0) > 0;
          return (
            <div
              key={key}
              className={cn(
                "text-[10px] text-center py-0.5 rounded-sm relative",
                isToday(day) && "bg-primary text-primary-foreground font-bold",
                hasItems && !isToday(day) && "font-semibold text-foreground"
              )}
            >
              {day.getDate()}
              {hasItems && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
