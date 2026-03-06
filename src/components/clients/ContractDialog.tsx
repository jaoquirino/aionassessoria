import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreateContract, useUpdateContract, type Contract } from "@/hooks/useContracts";
import { useAllModules } from "@/hooks/useModules";
import { useGenerateModuleOnboarding } from "@/hooks/useClientModuleOnboarding";
import { format, addMonths } from "date-fns";
import { parseLocalDate, cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Package, RotateCcw, Building2 } from "lucide-react";

interface ContractDialogProps {
  clientId: string;
  contract?: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractDialog({ clientId, contract, open, onOpenChange }: ContractDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [monthlyValue, setMonthlyValue] = useState(0);
  const [noValue, setNoValue] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [minDuration, setMinDuration] = useState(6);
  const [renewalDate, setRenewalDate] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState(10);
  const [notes, setNotes] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleDeliverableLimits, setModuleDeliverableLimits] = useState<Record<string, number | null>>({});
  const [requiresOnboarding, setRequiresOnboarding] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);
  const [isInternal, setIsInternal] = useState(false);

  const { data: modules = [] } = useAllModules();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const generateOnboarding = useGenerateModuleOnboarding();

  const isEditing = !!contract;

  useEffect(() => {
    if (contract) {
      setMonthlyValue(contract.monthly_value);
      setNoValue(contract.monthly_value === 0);
      setStartDate(contract.start_date);
      setMinDuration(contract.minimum_duration_months);
      setRenewalDate(contract.renewal_date || "");
      setNotes(contract.notes || "");
      setIsRecurring((contract as any).is_recurring !== false);
    } else {
      setMonthlyValue(0);
      setNoValue(false);
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setMinDuration(6);
      setRenewalDate(format(addMonths(new Date(), 5), "yyyy-MM-dd"));
      setPaymentDueDay(10);
      setNotes("");
      setSelectedModules([]);
      setModuleDeliverableLimits({});
      setRequiresOnboarding(true);
      setIsRecurring(true);
      setIsInternal(false);
    }
  }, [contract, open]);

  // Auto-calculate renewal date when start date or duration changes
  useEffect(() => {
    if (!isEditing && startDate && isRecurring) {
      const start = parseLocalDate(startDate);
      const renewal = addMonths(start, minDuration - 1);
      const yyyy = renewal.getFullYear();
      const mm = String(renewal.getMonth() + 1).padStart(2, "0");
      const dd = String(renewal.getDate()).padStart(2, "0");
      setRenewalDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [startDate, minDuration, isEditing, isRecurring]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleDeliverableLimitChange = (moduleId: string, value: string) => {
    const limit = value === "" ? null : parseInt(value);
    setModuleDeliverableLimits(prev => ({ ...prev, [moduleId]: limit }));
  };

  const handleInternalToggle = (checked: boolean) => {
    setIsInternal(checked);
    if (checked) {
      setMonthlyValue(0);
      setNoValue(true);
      setIsRecurring(false);
      setSelectedModules(activeModules.map(m => m.id));
    } else {
      setNoValue(false);
      setSelectedModules([]);
    }
  };

  const handleSave = async () => {
    if (!noValue && monthlyValue <= 0 || !startDate) return;

    try {
      if (isEditing && contract) {
        await updateContract.mutateAsync({
          id: contract.id,
          monthly_value: monthlyValue,
          start_date: startDate,
          minimum_duration_months: minDuration,
          renewal_date: isRecurring ? (renewalDate || null) : null,
          notes: notes.trim() || null,
          is_recurring: isRecurring,
        });
      } else {
        const newContract = await createContract.mutateAsync({
          client_id: clientId,
          monthly_value: monthlyValue,
          start_date: startDate,
          minimum_duration_months: minDuration,
          renewal_date: isRecurring ? (renewalDate || undefined) : undefined,
          notes: notes.trim() || undefined,
          modules: selectedModules,
          is_recurring: isRecurring,
        });

        // ONLY generate onboarding if requiresOnboarding is true AND modules are selected
        if (requiresOnboarding && selectedModules.length > 0 && newContract) {
          const { data: contractModules } = await supabase
            .from("contract_modules")
            .select("id, module_id")
            .eq("contract_id", newContract.id);

          if (contractModules && contractModules.length > 0) {
            await generateOnboarding.mutateAsync({
              clientId,
              contractId: newContract.id,
              contractModuleIds: contractModules.map(cm => ({
                contractModuleId: cm.id,
                moduleId: cm.module_id,
              })),
            });

            await supabase
              .from("clients")
              .update({ status: "onboarding" })
              .eq("id", clientId);

            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["client_contracts_full", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client_module_onboarding", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress", clientId] });
            queryClient.invalidateQueries({ queryKey: ["onboarding_tasks", clientId] });

            navigate(`/clientes/${clientId}/onboarding`);
          }
        }
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSaving = createContract.isPending || updateContract.isPending || generateOnboarding.isPending;
  const activeModules = modules.filter(m => m.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Internal Toggle */}
          {!isEditing && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="internal-contract" className="text-sm font-medium">
                    Contrato interno
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Seleciona todos os módulos, sem valor ou datas
                  </p>
                </div>
              </div>
              <Switch
                id="internal-contract"
                checked={isInternal}
                onCheckedChange={handleInternalToggle}
              />
            </div>
          )}

          {!isInternal && (
            <>
              <div className="space-y-2">
                <Label htmlFor="value">Valor Mensal *</Label>
                <CurrencyInput
                  id="value"
                  value={monthlyValue}
                  onChange={setMonthlyValue}
                  disabled={noValue}
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                  <Checkbox
                    checked={noValue}
                    onCheckedChange={(checked) => {
                      setNoValue(!!checked);
                      if (checked) setMonthlyValue(0);
                    }}
                  />
                  Sem valor (serviço gratuito ou interno)
                </label>
              </div>

              {/* Recurring Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="recurring-new" className="text-sm font-medium">
                      Contrato recorrente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isRecurring ? "Com data de início, duração e vencimento" : "Apenas dia de pagamento"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="recurring-new"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {isRecurring ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Entrada *</Label>
                    <DatePicker
                      id="startDate"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Selecionar data"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração Total</Label>
                    <Select value={String(minDuration)} onValueChange={(v) => setMinDuration(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 mês</SelectItem>
                        <SelectItem value="2">2 meses</SelectItem>
                        <SelectItem value="3">3 meses</SelectItem>
                        <SelectItem value="4">4 meses</SelectItem>
                        <SelectItem value="5">5 meses</SelectItem>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses</SelectItem>
                        <SelectItem value="24">24 meses</SelectItem>
                        <SelectItem value="36">36 meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renewalDate">Vencimento</Label>
                    <DatePicker
                      id="renewalDate"
                      value={renewalDate}
                      onChange={setRenewalDate}
                      placeholder="Selecionar data"
                      disabled
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="paymentDay">Dia de Pagamento</Label>
                  <Input
                    id="paymentDay"
                    type="number"
                    min={1}
                    max={31}
                    value={paymentDueDay}
                    onChange={(e) => {
                      const val = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                      setPaymentDueDay(val);
                    }}
                    placeholder="1-31"
                    className="w-24"
                  />
                </div>
              )}
            </>
          )}

          {!isEditing && activeModules.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-medium">Módulos Contratados</Label>
                  </div>
                  {selectedModules.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedModules.length} selecionado{selectedModules.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {activeModules.map((module) => {
                    const isSelected = selectedModules.includes(module.id);
                    return (
                      <div 
                        key={module.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                          isSelected 
                            ? "bg-primary/5 border-primary/20" 
                            : "bg-muted/20 border-transparent hover:bg-muted/40"
                        )}
                        onClick={() => toggleModule(module.id)}
                      >
                        <Checkbox
                          id={`create-module-${module.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleModule(module.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`create-module-${module.id}`} className="text-sm font-medium cursor-pointer">
                            {module.name}
                          </label>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">Peso: {module.default_weight}</span>
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
                              value={moduleDeliverableLimits[module.id] ?? module.deliverable_limit ?? ""}
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
            </>
          )}

          {/* Onboarding toggle - only for new contracts */}
          {!isEditing && selectedModules.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="onboarding" className="text-sm font-medium">
                  Gerar Onboarding
                </Label>
                <p className="text-xs text-muted-foreground">
                  Criar tarefas de ativação para cada módulo selecionado
                </p>
              </div>
              <Switch
                id="onboarding"
                checked={requiresOnboarding}
                onCheckedChange={setRequiresOnboarding}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o contrato..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || (!noValue && monthlyValue <= 0)}>
            {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Criar Contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
