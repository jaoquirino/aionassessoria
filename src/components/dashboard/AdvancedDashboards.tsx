import { useState, useMemo } from "react";
import { Package, CheckCircle, Clock, Filter, TrendingUp, TrendingDown, DollarSign, FileText, Image, Video, AlertTriangle, X, CornerDownRight } from "lucide-react";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveriesByClient, useFinancialEvolution } from "@/hooks/useDeliveriesDashboard";
import { useAllClients } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { PeriodSelector, type PeriodOption, type CustomDateRange, getPeriodDates } from "./PeriodSelector";

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
  period?: PeriodOption; // kept for backward compat but no longer used externally
}

export function DeliveriesDashboard({ period: _externalPeriod }: DeliveriesDashboardProps) {
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>();
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "pending" | "overdue">("all");
  const [designFilter, setDesignFilter] = useState<"all" | "arte" | "video">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const { data: clients, isLoading: clientsLoading } = useAllClients();
  const { data: deliveries, isLoading: deliveriesLoading } = useDeliveriesByClient(
    selectedClient === "all" ? undefined : selectedClient
  );

  const isLoading = clientsLoading || deliveriesLoading;

  const clientLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    clients?.forEach(c => { if (c.logo_url) map.set(c.id, c.logo_url); });
    return map;
  }, [clients]);

  // Filter deliveries by period
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    
    const periodDates = getPeriodDates(period, customRange);
    const { start, end } = periodDates;
    
    return deliveries.filter(d => {
      const dueDate = new Date(d.dueDate);
      return dueDate >= start && dueDate <= end;
    });
  }, [deliveries, period, customRange]);

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

  const groupedDeliveries = {
    done: filteredDeliveries.filter(d => d.status === "done"),
    pending: filteredDeliveries.filter(d => d.status !== "done"),
  };

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
          {/* Period Selector */}
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
          
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
                    <span className="flex items-center gap-2">
                      {client.logo_url && (
                        <img src={client.logo_url} alt="" className="h-4 w-4 rounded object-contain shrink-0" />
                      )}
                      {client.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Unified Filter Bar */}
      {(() => {
        const overdue = filteredDeliveries.filter(d => d.status !== "done" && new Date(d.dueDate) < new Date());
        const arteCount = filteredDeliveries.filter(d => d.deliverableType === "arte").length;
        const videoCount = filteredDeliveries.filter(d => d.deliverableType === "video").length;

        const typeOptions = [
          { value: "recurring", label: "Recorrente" },
          { value: "planning", label: "Planejamento" },
          { value: "project", label: "Projeto" },
          { value: "extra", label: "Extra" },
        ];

        // Apply all filters
        let displayDeliveries = filteredDeliveries;
        if (statusFilter === "done") displayDeliveries = displayDeliveries.filter(d => d.status === "done");
        else if (statusFilter === "pending") displayDeliveries = displayDeliveries.filter(d => d.status !== "done");
        else if (statusFilter === "overdue") displayDeliveries = displayDeliveries.filter(d => d.status !== "done" && new Date(d.dueDate) < new Date());
        if (designFilter !== "all") displayDeliveries = displayDeliveries.filter(d => d.deliverableType === designFilter);
        if (typeFilter !== "all") displayDeliveries = displayDeliveries.filter(d => d.type === typeFilter);

        const hasActiveFilter = statusFilter !== "all" || designFilter !== "all" || typeFilter !== "all";

        return (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {/* Status filters */}
              <button
                onClick={() => setStatusFilter(statusFilter === "all" ? "all" : "all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                Total ({filteredDeliveries.length})
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "done" ? "all" : "done")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  statusFilter === "done"
                    ? "bg-success text-success-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Entregues ({groupedDeliveries.done.length})
                </span>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  statusFilter === "pending"
                    ? "bg-warning text-warning-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                Pendentes ({groupedDeliveries.pending.length})
              </button>
              {overdue.length > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === "overdue" ? "all" : "overdue")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                    statusFilter === "overdue"
                      ? "bg-destructive text-destructive-foreground border-destructive shadow-sm"
                      : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Atrasadas ({overdue.length})
                  </span>
                </button>
              )}

              <div className="w-px h-6 bg-border mx-1" />

              {/* Design type filters */}
              {arteCount > 0 && (
                <button
                  onClick={() => setDesignFilter(designFilter === "arte" ? "all" : "arte")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                    designFilter === "arte"
                      ? "bg-purple text-white border-purple shadow-sm"
                      : "bg-purple/10 text-purple border-purple/20 hover:bg-purple/20"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Image className="h-3.5 w-3.5" />
                    Artes ({arteCount})
                  </span>
                </button>
              )}
              {videoCount > 0 && (
                <button
                  onClick={() => setDesignFilter(designFilter === "video" ? "all" : "video")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                    designFilter === "video"
                      ? "bg-info text-white border-info shadow-sm"
                      : "bg-info/10 text-info border-info/20 hover:bg-info/20"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" />
                    Vídeos ({videoCount})
                  </span>
                </button>
              )}

              <div className="w-px h-6 bg-border mx-1" />

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue placeholder="Tipo de tarefa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilter && (
                <button
                  onClick={() => { setStatusFilter("all"); setDesignFilter("all"); setTypeFilter("all"); }}
                  className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpar filtros
                </button>
              )}
            </div>

            {/* Deliveries List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Lista de Entregas ({displayDeliveries.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {displayDeliveries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma entrega encontrada</p>
                  ) : (
                    displayDeliveries.map((delivery) => {
                      const StatusIcon = statusConfig[delivery.status]?.icon || Clock;
                      return (
                        <div
                          key={delivery.id}
                          onClick={() => setSelectedTaskId(delivery.id)}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <StatusIcon className={cn(
                              "h-4 w-4",
                              delivery.status === "done" ? "text-success" : "text-muted-foreground"
                            )} />
                            <div>
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                {delivery.isSubtask && (
                                  <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                )}
                                {delivery.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {delivery.clientName}
                                {delivery.moduleName && ` · ${delivery.moduleName}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {delivery.deliverableType && (
                              <Badge variant="outline" className={cn(
                                "text-xs shrink-0",
                                delivery.deliverableType === "arte" ? "border-purple/30 text-purple" : "border-info/30 text-info"
                              )}>
                                {delivery.deliverableType === "arte" ? "🎨 Arte" : "🎬 Vídeo"}
                              </Badge>
                            )}
                            <Badge className={cn("shrink-0", statusConfig[delivery.status]?.color)}>
                              {statusConfig[delivery.status]?.label || delivery.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}
      <TaskEditDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
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