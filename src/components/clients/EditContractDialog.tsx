import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useUpdateContract, type ContractWithModules } from "@/hooks/useContracts";
import { useAllModules } from "@/hooks/useModules";
import { useUpdateContractModules } from "@/hooks/useContractModules";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Package } from "lucide-react";

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

  const updateContract = useUpdateContract();
  const updateModules = useUpdateContractModules();
  const { data: allModules } = useAllModules();

  useEffect(() => {
    if (contract && allModules) {
      setMonthlyValue(contract.monthly_value);
      setStartDate(format(new Date(contract.start_date), "yyyy-MM-dd"));
      setRenewalDate(contract.renewal_date ? format(new Date(contract.renewal_date), "yyyy-MM-dd") : "");
      setPaymentDueDay((contract as any).payment_due_day || 10);
      setMinimumDuration(contract.minimum_duration_months);
      setStatus(contract.status);
      setNotes(contract.notes || "");

      // Initialize module configs from contract modules
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
      renewal_date: renewalDate || null,
      payment_due_day: paymentDueDay,
      minimum_duration_months: minimumDuration,
      status,
      notes: notes || null,
    });

    // Update modules
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

  const isDesignModule = (moduleName: string) => {
    const designKeywords = ["design", "arte", "visual", "gráfico"];
    return designKeywords.some(k => moduleName.toLowerCase().includes(k));
  };

  if (!contract) return null;

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data de Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renewal-date">Data de Renovação</Label>
              <Input
                id="renewal-date"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-duration">Duração Mínima (meses)</Label>
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

          <Separator />

          {/* Modules Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Módulos Contratados</Label>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allModules?.filter(m => m.is_active).map((module) => {
                const config = moduleConfigs.find(c => c.moduleId === module.id);
                const isDesign = isDesignModule(module.name);
                
                return (
                  <div 
                    key={module.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`module-${module.id}`}
                      checked={config?.selected || false}
                      onCheckedChange={() => handleModuleToggle(module.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={`module-${module.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {module.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Peso: {module.default_weight} · {module.primary_role}
                      </p>
                    </div>
                    
                    {/* Deliverable limit - shown for design modules or if already has a limit */}
                    {(isDesign || module.deliverable_limit !== null) && config?.selected && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={config?.deliverableLimit ?? ""}
                          onChange={(e) => handleDeliverableLimitChange(module.id, e.target.value)}
                          placeholder="∞"
                          className="w-16 h-8 text-center text-sm"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">entregáveis</span>
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
