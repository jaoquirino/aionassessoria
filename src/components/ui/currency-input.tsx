import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() => {
    if (value === 0) return "";
    return formatDisplayValue(value);
  });

  function formatDisplayValue(num: number): string {
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function parseToNumber(str: string): number {
    const cleaned = str.replace(/[^\d]/g, "");
    if (!cleaned) return 0;
    return parseInt(cleaned, 10) / 100;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numericValue = parseToNumber(raw);
    
    if (numericValue === 0) {
      setDisplayValue("");
      onChange(0);
    } else {
      setDisplayValue(formatDisplayValue(numericValue));
      onChange(numericValue);
    }
  };

  // Sync external value changes
  React.useEffect(() => {
    if (value === 0) {
      setDisplayValue("");
    } else {
      setDisplayValue(formatDisplayValue(value));
    }
  }, [value]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className={cn("pl-10", className)}
        placeholder="0,00"
      />
    </div>
  );
}
