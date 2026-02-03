import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: "normal" | "attention" | "critical";
  delay?: number;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status,
  delay = 0,
}: MetricCardProps) {
  const statusColors = {
    normal: "border-success/30 bg-success/5",
    attention: "border-warning/30 bg-warning/5",
    critical: "border-destructive/30 bg-destructive/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      className={cn(
        "card-metric group cursor-pointer",
        status && statusColors[status]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}% vs. último mês
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
            status === "critical"
              ? "bg-destructive/10 text-destructive"
              : status === "attention"
              ? "bg-warning/10 text-warning"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {status && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "status-indicator",
              status === "normal" && "status-normal",
              status === "attention" && "status-attention",
              status === "critical" && "status-critical"
            )}
          />
          <span className="text-xs font-medium capitalize text-muted-foreground">
            Status: {status === "normal" ? "Normal" : status === "attention" ? "Atenção" : "Crítico"}
          </span>
        </div>
      )}
    </motion.div>
  );
}
