import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useUpdateContract, type ContractWithModules } from "@/hooks/useContracts";
import { useAllModules } from "@/hooks/useModules";
import { useUpdateContractModules } from "@/hooks/useContractModules";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Package, RotateCcw, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditContractDialogProps {
  contract: ContractWithModules | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: "active", label: "Ativo" },
  { value: "ended", label: "Encerrado" },
];

interface ModuleConfig {
  moduleId: string;
  selected: boolean;
  deliverableLimit: number | null;
}

export function EditContractDialog({
  contract,
  open,
  onOpenChange,
}: EditContractDialogProps) {
  const [monthlyValue, setMonthlyValue] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState(10);
  const [minimumDuration, setMinimumDuration] = useState(12);
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [moduleConfigs, setModuleConfigs] = useState<ModuleConfig[]>([]);
  const [isRecurring, setIsRecurring] = useState(true);
  const [isInternal, setIsInternal] = useState(false);

  const updateContract = useUpdateContract();
  const updateModules = useUpdateContractModules();
  const { data: allModules } = useAllModules();

  useEffect(() => {
    if (contract && allModules) {
      setMonthlyValue(contract.monthly_value);
      setStartDate(contract.start_date);
      setRenewalDate(contract.renewal_date || "");
      setPaymentDueDay((contract as any).payment_due_day || 10);
      setMinimumDuration(contract.minimum_duration_months);
      setStatus(contract.status);
      setNotes(contract.notes || "");
      setIsRecurring((contract as any).is_recurring !== false);

      // Detect internal: no value, not recurring, all active modules selected
      const activeModuleIds = allModules.filter(m => m.is_active).map(m => m.id);
      const contractModuleIds = contract.modules?.map(m => m.module_id) || [];
      const allSelected = activeModuleIds.length > 0 && activeModuleIds.every(id => contractModuleIds.includes(id));
      setIsInternal(contract.monthly_value === 0 && !(contract as any).is_recurring && allSelected);

      const configs: ModuleConfig[] = allModules.map((module) => {
        const existingModule = contract.modules?.find(m => m.module_id === module.id);
        return {
          moduleId: module.id,
          selected: !!existingModule,
          deliverableLimit: existingModule?.deliverable_limit ?? module.deliverable_limit ?? null,
        };
      });
      setModuleConfigs(configs);
    }
  }, [contract, allModules]);

  const handleModuleToggle = (moduleId: string) => {
    setModuleConfigs(prev => prev.map(config => 
      config.moduleId === moduleId 
        ? { ...config, selected: !config.selected }
        : config
    ));
  };

  const handleDeliverableLimitChange = (moduleId: string, value: string) => {
    const limit = value === "" ? null : parseInt(value);
    setModuleConfigs(prev => prev.map(config => 
      config.moduleId === moduleId 
        ? { ...config, deliverableLimit: limit }
        : config
    ));
  };

  const handleSave = async () => {
    if (!contract) return;

    await updateContract.mutateAsync({
      id: contract.id,
      monthly_value: monthlyValue,
      start_date: startDate,
      renewal_date: isRecurring ? (renewalDate || null) : null,
      payment_due_day: paymentDueDay,
      minimum_duration_months: minimumDuration,
      status,
      notes: notes || null,
      is_recurring: isRecurring,
    });

    const selectedModules = moduleConfigs
      .filter(c => c.selected)
      .map(c => ({
        moduleId: c.moduleId,
        deliverableLimit: c.deliverableLimit,
      }));

    await updateModules.mutateAsync({
      contractId: contract.id,
      modules: selectedModules,
    });

    onOpenChange(false);
  };

  if (!contract) return null;

  const selectedCount = moduleConfigs.filter(c => c.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-value">Valor Mensal</Label>
            <CurrencyInput
              id="monthly-value"
              value={monthlyValue}
              onChange={setMonthlyValue}
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="recurring" className="text-sm font-medium">
                  Contrato recorrente
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRecurring ? "Com data de início, duração e vencimento" : "Apenas dia de pagamento"}
                </p>
              </div>
            </div>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data de Início</Label>
                  <DatePicker
                    id="start-date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Selecionar data"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="renewal-date">Vencimento</Label>
                  <DatePicker
                    id="renewal-date"
                    value={renewalDate}
                    onChange={setRenewalDate}
                    placeholder="Selecionar data"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-due-day">Dia Pgto</Label>
                  <Input
                    id="payment-due-day"
                    type="number"
                    min={1}
                    max={31}
                    value={paymentDueDay}
                    onChange={(e) => {
                      const val = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                      setPaymentDueDay(val);
                    }}
                    placeholder="1-31"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-duration">Duração Total (meses)</Label>
                  <Input
                    id="min-duration"
                    type="number"
                    min={1}
                    value={minimumDuration}
                    onChange={(e) => setMinimumDuration(parseInt(e.target.value) || 12)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract-status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="contract-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-due-day">Dia de Pagamento</Label>
                <Input
                  id="payment-due-day"
                  type="number"
                  min={1}
                  max={31}
                  value={paymentDueDay}
                  onChange={(e) => {
                    const val = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                    setPaymentDueDay(val);
                  }}
                  placeholder="1-31"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="contract-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          {/* Modules Section - improved */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Módulos Contratados</Label>
              </div>
              {selectedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            
            <div className="grid gap-2 max-h-56 overflow-y-auto">
              {allModules?.filter(m => m.is_active).map((module) => {
                const config = moduleConfigs.find(c => c.moduleId === module.id);
                const isSelected = config?.selected || false;
                
                return (
                  <div 
                    key={module.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      isSelected 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-muted/20 border-transparent hover:bg-muted/40"
                    )}
                    onClick={() => handleModuleToggle(module.id)}
                  >
                    <Checkbox
                      id={`module-${module.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleModuleToggle(module.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={`module-${module.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {module.name}
                      </label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Peso: {module.default_weight}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {module.primary_role}
                        </span>
                        {module.is_recurring && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              Recorrente
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          min={0}
                          value={config?.deliverableLimit ?? ""}
                          onChange={(e) => handleDeliverableLimitChange(module.id, e.target.value)}
                          placeholder="∞"
                          className="w-16 h-8 text-center text-sm"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">entregas</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o contrato..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateContract.isPending || updateModules.isPending}>
            {updateContract.isPending || updateModules.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
