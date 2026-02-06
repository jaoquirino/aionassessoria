import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateContract, useUpdateContract, type Contract } from "@/hooks/useContracts";
import { useAllModules } from "@/hooks/useModules";
import { useGenerateModuleOnboarding } from "@/hooks/useClientModuleOnboarding";
import { format, addMonths } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

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
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [minDuration, setMinDuration] = useState(6);
  const [renewalDate, setRenewalDate] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState(10);
  const [notes, setNotes] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleDeliverableLimits, setModuleDeliverableLimits] = useState<Record<string, number | null>>({});
  const [requiresOnboarding, setRequiresOnboarding] = useState(true);

  const { data: modules = [] } = useAllModules();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const generateOnboarding = useGenerateModuleOnboarding();

  const isEditing = !!contract;

  useEffect(() => {
    if (contract) {
      setMonthlyValue(contract.monthly_value);
      setStartDate(contract.start_date);
      setMinDuration(contract.minimum_duration_months);
      setRenewalDate(contract.renewal_date || "");
      setNotes(contract.notes || "");
    } else {
      setMonthlyValue(0);
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setMinDuration(6);
      setRenewalDate(format(addMonths(new Date(), 6), "yyyy-MM-dd"));
      setPaymentDueDay(10);
      setNotes("");
      setSelectedModules([]);
      setModuleDeliverableLimits({});
      setRequiresOnboarding(true);
    }
  }, [contract, open]);

  // Auto-calculate renewal date when start date or duration changes
  useEffect(() => {
    if (!isEditing && startDate) {
      const start = parseLocalDate(startDate);
      const renewal = addMonths(start, minDuration - 1);
      const yyyy = renewal.getFullYear();
      const mm = String(renewal.getMonth() + 1).padStart(2, "0");
      const dd = String(renewal.getDate()).padStart(2, "0");
      setRenewalDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [startDate, minDuration, isEditing]);

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

  const moduleNeedsDeliverableLimit = (moduleName: string, defaultLimit: number | null) => {
    if (defaultLimit !== null) return true;
    const designKeywords = ["design", "arte", "visual", "gráfico", "video", "vídeo"];
    return designKeywords.some(k => moduleName.toLowerCase().includes(k));
  };

  const handleSave = async () => {
    if (monthlyValue <= 0 || !startDate) return;

    try {
      if (isEditing && contract) {
        await updateContract.mutateAsync({
          id: contract.id,
          monthly_value: monthlyValue,
          start_date: startDate,
          minimum_duration_months: minDuration,
          renewal_date: renewalDate || null,
          notes: notes.trim() || null,
        });
      } else {
        // Create contract with requires_onboarding flag
        const newContract = await createContract.mutateAsync({
          client_id: clientId,
          monthly_value: monthlyValue,
          start_date: startDate,
          minimum_duration_months: minDuration,
          renewal_date: renewalDate || undefined,
          notes: notes.trim() || undefined,
          modules: selectedModules,
        });

        // ONLY generate onboarding if requiresOnboarding is true AND modules are selected
        if (requiresOnboarding && selectedModules.length > 0 && newContract) {
          // Fetch the created contract_modules to get their IDs
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

            // Set client status to onboarding only when generating onboarding
            await supabase
              .from("clients")
              .update({ status: "onboarding" })
              .eq("id", clientId);

            // Refresh UI instantly (no need to leave and come back)
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["client_contracts_full", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client_module_onboarding", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client_onboarding_progress", clientId] });
            queryClient.invalidateQueries({ queryKey: ["onboarding_tasks", clientId] });

            // Go straight to onboarding flow
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="value">Valor Mensal *</Label>
            <CurrencyInput
              id="value"
              value={monthlyValue}
              onChange={setMonthlyValue}
            />
          </div>

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

          {!isEditing && modules.filter(m => m.is_active).length > 0 && (
            <div className="space-y-2">
              <Label>Módulos Contratados</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {modules.filter(m => m.is_active).map((module) => (
                  <div key={module.id} className="flex items-center gap-3 p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`create-module-${module.id}`}
                      checked={selectedModules.includes(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`create-module-${module.id}`} className="text-sm font-medium cursor-pointer">
                        {module.name}
                      </label>
                      <p className="text-xs text-muted-foreground">Peso: {module.default_weight}</p>
                    </div>
                    {selectedModules.includes(module.id) && (
                      <div className="flex items-center gap-1.5">
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
                ))}
              </div>
            </div>
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
          <Button onClick={handleSave} disabled={isSaving || monthlyValue <= 0}>
            {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Criar Contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
