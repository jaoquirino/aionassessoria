import { useMemo } from "react";
import { CalendarDayCell, CalendarItem } from "./CalendarDayCell";

interface CalendarGridProps {
  currentMonth: Date;
  items: CalendarItem[];
  itemsByDate: Record<string, CalendarItem[]>;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarGrid({ currentMonth, itemsByDate, onDayClick }: CalendarGridProps) {
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {weeks.flat().map(date => {
          const key = date.toISOString().split("T")[0];
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isToday = date.getTime() === today.getTime();
          return (
            <CalendarDayCell
              key={key}
              date={date}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              items={itemsByDate[key] || []}
              onDayClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}
