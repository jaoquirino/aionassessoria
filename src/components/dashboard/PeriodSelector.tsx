import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodOption = "7d" | "30d" | "90d" | "year" | "all" | "custom";

export interface CustomDateRange {
  start: Date;
  end: Date;
}

interface PeriodSelectorProps {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
  customRange?: CustomDateRange;
  onCustomRangeChange?: (range: CustomDateRange) => void;
  className?: string;
}

const periodLabels: Record<PeriodOption, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  "year": "Este ano",
  "all": "Todo período",
  "custom": "Personalizado",
};

export function PeriodSelector({ value, onChange, customRange, onCustomRangeChange, className }: PeriodSelectorProps) {
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: customRange?.start,
    to: customRange?.end,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (value === "custom") {
      setCalendarOpen(true);
    }
  }, [value]);

  const handleSelectChange = (newValue: string) => {
    onChange(newValue as PeriodOption);
  };

  const handleApplyCustomRange = () => {
    if (tempRange.from && tempRange.to && onCustomRangeChange) {
      onCustomRangeChange({ start: tempRange.from, end: tempRange.to });
      setCalendarOpen(false);
    }
  };

  const displayText =
    value === "custom" && customRange
      ? `${format(customRange.start, "dd/MM/yy")} - ${format(customRange.end, "dd/MM/yy")}`
      : periodLabels[value];

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-48 bg-background">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{displayText}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {Object.entries(periodLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {value === "custom" && (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0" aria-label="Selecionar período personalizado">
                <CalendarDays className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <p className="text-sm font-medium">Selecione o período</p>
                <Calendar
                  mode="range"
                  selected={{ from: tempRange.from, to: tempRange.to }}
                  onSelect={(range) => setTempRange({ from: range?.from, to: range?.to })}
                  locale={ptBR}
                  numberOfMonths={2}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCalendarOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplyCustomRange}
                    disabled={!tempRange.from || !tempRange.to}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

export function getPeriodDates(period: PeriodOption, customRange?: CustomDateRange): { start: Date; end: Date } {
  if (period === "custom" && customRange) {
    return { start: customRange.start, end: customRange.end };
  }

  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (period) {
    case "7d":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
    case "custom":
    default:
      start = new Date(2020, 0, 1);
      break;
  }

  return { start, end };
}
