import { useState, useMemo } from "react";
import { Package, CheckCircle, Clock, Filter, TrendingUp, TrendingDown, DollarSign, FileText, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDeliveriesByClient, useFinancialEvolution } from "@/hooks/useDeliveriesDashboard";
import { useAllClients } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { type PeriodOption, getPeriodDates } from "./PeriodSelector";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  todo: { label: "A fazer", color: "bg-muted text-muted-foreground", icon: Clock },
  in_progress: { label: "Em produção", color: "bg-primary/20 text-primary", icon: Clock },
  review: { label: "Revisão", color: "bg-warning/20 text-warning", icon: Clock },
  waiting_client: { label: "Aguardando", color: "bg-info/20 text-info", icon: Clock },
  done: { label: "Entregue", color: "bg-success/20 text-success", icon: CheckCircle },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

interface DeliveriesDashboardProps {
  period: PeriodOption;
}

export function DeliveriesDashboard({ period }: DeliveriesDashboardProps) {
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [useCustomDates, setUseCustomDates] = useState(false);
  
  const { data: clients, isLoading: clientsLoading } = useAllClients();
  const { data: deliveries, isLoading: deliveriesLoading } = useDeliveriesByClient(
    selectedClient === "all" ? undefined : selectedClient
  );

  const isLoading = clientsLoading || deliveriesLoading;

  // Filter deliveries by period or custom dates
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    
    let start: Date, end: Date;
    
    if (useCustomDates && customStartDate && customEndDate) {
      start = customStartDate;
      end = customEndDate;
    } else {
      const periodDates = getPeriodDates(period);
      start = periodDates.start;
      end = periodDates.end;
    }
    
    return deliveries.filter(d => {
      const dueDate = new Date(d.dueDate);
      return dueDate >= start && dueDate <= end;
    });
  }, [deliveries, period, useCustomDates, customStartDate, customEndDate]);

  // Group deliveries by status
  const groupedDeliveries = {
    done: filteredDeliveries.filter(d => d.status === "done"),
    pending: filteredDeliveries.filter(d => d.status !== "done"),
  };

  const handleClearCustomDates = () => {
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setUseCustomDates(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entregas por Cliente
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredDeliveries.length} entregáveis no período
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Date Range */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "gap-2",
                  useCustomDates && customStartDate && "border-primary"
                )}>
                  <CalendarIcon className="h-4 w-4" />
                  {customStartDate ? format(customStartDate, "dd/MM/yy", { locale: ptBR }) : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={(date) => {
                    setCustomStartDate(date);
                    if (date) setUseCustomDates(true);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "gap-2",
                  useCustomDates && customEndDate && "border-primary"
                )}>
                  <CalendarIcon className="h-4 w-4" />
                  {customEndDate ? format(customEndDate, "dd/MM/yy", { locale: ptBR }) : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={(date) => {
                    setCustomEndDate(date);
                    if (date) setUseCustomDates(true);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {useCustomDates && (
              <Button variant="ghost" size="sm" onClick={handleClearCustomDates}>
                Limpar
              </Button>
            )}
          </div>
          
          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Entregues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{groupedDeliveries.done.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{groupedDeliveries.pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peso Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDeliveries.reduce((sum, d) => sum + d.weight, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredDeliveries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma entrega encontrada no período</p>
            ) : (
              filteredDeliveries.map((delivery) => {
                const StatusIcon = statusConfig[delivery.status]?.icon || Clock;
                return (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={cn(
                        "h-4 w-4",
                        delivery.status === "done" ? "text-success" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium text-sm">{delivery.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {delivery.clientName}
                          {delivery.moduleName && ` · ${delivery.moduleName}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn("shrink-0", statusConfig[delivery.status]?.color)}>
                      {statusConfig[delivery.status]?.label || delivery.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FinancialEvolutionDashboard() {
  const { data, isLoading } = useFinancialEvolution();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) return null;

  const { currentYear, previousYear, data: monthlyData, totals } = data;

  // Transform data for charts
  const chartData = monthlyData.map(m => ({
    name: m.monthName,
    [currentYear]: m.currentYearRevenue,
    [previousYear]: m.previousYearRevenue,
    [`Contratos ${currentYear}`]: m.currentYearContracts,
    [`Contratos ${previousYear}`]: m.previousYearContracts,
  }));

  const revenueGrowth = totals.previousYearTotalRevenue > 0 
    ? ((totals.currentYearTotalRevenue - totals.previousYearTotalRevenue) / totals.previousYearTotalRevenue * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução Financeira
        </h2>
        <p className="text-sm text-muted-foreground">
          Comparativo {previousYear} vs {currentYear}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Receita {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totals.currentYearTotalRevenue / 12)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Receita {previousYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totals.previousYearTotalRevenue / 12)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Média Contratos {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totals.currentYearAvgContracts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Crescimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold flex items-center gap-1",
              revenueGrowth >= 0 ? "text-success" : "text-destructive"
            )}>
              {revenueGrowth >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {revenueGrowth.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey={previousYear} fill="hsl(var(--destructive))" name={`${previousYear}`} radius={[4, 4, 0, 0]} />
                <Bar dataKey={currentYear} fill="hsl(var(--primary))" name={`${currentYear}`} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quantidade de Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey={`Contratos ${previousYear}`} 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey={`Contratos ${currentYear}`} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}