import { motion } from "framer-motion";
import { AlertTriangle, Calendar, DollarSign, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Contract {
  id: string;
  clientName: string;
  monthlyValue: number;
  renewalDate: string;
  daysUntilRenewal: number;
  status: "active" | "expiring_soon" | "renewing" | "ended";
}

const mockContracts: Contract[] = [
  {
    id: "1",
    clientName: "Loja Fashion",
    monthlyValue: 3500,
    renewalDate: "2024-02-15",
    daysUntilRenewal: 25,
    status: "expiring_soon",
  },
  {
    id: "2",
    clientName: "Tech Solutions",
    monthlyValue: 5000,
    renewalDate: "2024-02-01",
    daysUntilRenewal: 11,
    status: "expiring_soon",
  },
  {
    id: "3",
    clientName: "Restaurante Bella",
    monthlyValue: 2800,
    renewalDate: "2024-01-28",
    daysUntilRenewal: 7,
    status: "renewing",
  },
];

const statusConfig = {
  active: { label: "Ativo", color: "bg-success/20 text-success" },
  expiring_soon: { label: "Próximo do vencimento", color: "bg-warning/20 text-warning" },
  renewing: { label: "Em renovação", color: "bg-primary/20 text-primary" },
  ended: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

export function ContractsAlert() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass rounded-xl p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Alertas de Contratos
            </h3>
            <p className="text-sm text-muted-foreground">
              {mockContracts.length} contratos requerem atenção
            </p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {mockContracts.map((contract, index) => (
          <motion.div
            key={contract.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className={cn(
              "flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-muted/50",
              contract.daysUntilRenewal <= 7
                ? "border-destructive/30 bg-destructive/5"
                : contract.daysUntilRenewal <= 30
                ? "border-warning/30 bg-warning/5"
                : "border-border"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  {contract.clientName}
                </span>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{formatCurrency(contract.monthlyValue)}/mês</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Renova em {contract.daysUntilRenewal} dias</span>
                  </div>
                </div>
              </div>
            </div>

            <Badge className={cn(statusConfig[contract.status].color)}>
              {statusConfig[contract.status].label}
            </Badge>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
