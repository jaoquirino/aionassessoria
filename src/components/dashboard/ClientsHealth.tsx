import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientHealth {
  id: string;
  name: string;
  monthlyValue: number;
  operationalWeight: number;
  deliveriesThisMonth: number;
  pendingTasks: number;
  healthStatus: "normal" | "attention" | "critical";
  profitRatio: number; // value/weight ratio
}

const mockClients: ClientHealth[] = [
  {
    id: "1",
    name: "Tech Solutions",
    monthlyValue: 5000,
    operationalWeight: 12,
    deliveriesThisMonth: 8,
    pendingTasks: 3,
    healthStatus: "normal",
    profitRatio: 1.2,
  },
  {
    id: "2",
    name: "Loja Fashion",
    monthlyValue: 3500,
    operationalWeight: 18,
    deliveriesThisMonth: 12,
    pendingTasks: 5,
    healthStatus: "attention",
    profitRatio: 0.8,
  },
  {
    id: "3",
    name: "Restaurante Bella",
    monthlyValue: 2800,
    operationalWeight: 22,
    deliveriesThisMonth: 15,
    pendingTasks: 7,
    healthStatus: "critical",
    profitRatio: 0.5,
  },
  {
    id: "4",
    name: "Fit Academia",
    monthlyValue: 2200,
    operationalWeight: 8,
    deliveriesThisMonth: 5,
    pendingTasks: 2,
    healthStatus: "normal",
    profitRatio: 1.5,
  },
];

function getHealthIcon(status: string) {
  switch (status) {
    case "critical":
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    case "attention":
      return <Minus className="h-4 w-4 text-warning" />;
    default:
      return <TrendingUp className="h-4 w-4 text-success" />;
  }
}

export function ClientsHealth() {
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
      transition={{ delay: 0.6 }}
      className="glass rounded-xl p-6"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Saúde dos Clientes
        </h3>
        <p className="text-sm text-muted-foreground">
          Relação valor × peso operacional
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cliente
              </th>
              <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Receita
              </th>
              <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Peso Op.
              </th>
              <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Entregas
              </th>
              <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockClients.map((client, index) => (
              <motion.tr
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 * index }}
                className="group"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        client.healthStatus === "normal" && "bg-success",
                        client.healthStatus === "attention" && "bg-warning",
                        client.healthStatus === "critical" && "bg-destructive"
                      )}
                    />
                    <span className="font-medium text-foreground">
                      {client.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-sm text-foreground">
                  {formatCurrency(client.monthlyValue)}
                </td>
                <td className="py-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      client.operationalWeight > 15
                        ? "bg-destructive/10 text-destructive"
                        : client.operationalWeight > 10
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
                    )}
                  >
                    {client.operationalWeight}
                  </span>
                </td>
                <td className="py-4 text-sm text-muted-foreground">
                  {client.deliveriesThisMonth} este mês
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(client.healthStatus)}
                    <span
                      className={cn(
                        "text-xs font-medium capitalize",
                        client.healthStatus === "normal" && "text-success",
                        client.healthStatus === "attention" && "text-warning",
                        client.healthStatus === "critical" && "text-destructive"
                      )}
                    >
                      {client.healthStatus === "normal"
                        ? "Saudável"
                        : client.healthStatus === "attention"
                        ? "Atenção"
                        : "Crítico"}
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <button className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
