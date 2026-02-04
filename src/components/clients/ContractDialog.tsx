import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContract, useUpdateContract, type Contract } from "@/hooks/useContracts";
import { useAllModules } from "@/hooks/useModules";
import { format, addMonths } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";

interface ContractDialogProps {
  clientId: string;
  contract?: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractDialog({ clientId, contract, open, onOpenChange }: ContractDialogProps) {
  const [monthlyValue, setMonthlyValue] = useState(0);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [minDuration, setMinDuration] = useState(6);
  const [renewalDate, setRenewalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const { data: modules = [] } = useAllModules();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

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
      setNotes("");
      setSelectedModules([]);
    }
  }, [contract, open]);

  // Auto-calculate renewal date when start date or duration changes
  useEffect(() => {
    if (!isEditing && startDate) {
      setRenewalDate(format(addMonths(new Date(startDate), minDuration), "yyyy-MM-dd"));
    }
  }, [startDate, minDuration, isEditing]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
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
        await createContract.mutateAsync({
          client_id: clientId,
          monthly_value: monthlyValue,
          start_date: startDate,
          minimum_duration_months: minDuration,
          renewal_date: renewalDate || undefined,
          notes: notes.trim() || undefined,
          modules: selectedModules,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSaving = createContract.isPending || updateContract.isPending;

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração Mínima</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="renewalDate">Data de Renovação</Label>
            <Input
              id="renewalDate"
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
            />
          </div>

          {!isEditing && modules.filter(m => m.is_active).length > 0 && (
            <div className="space-y-2">
              <Label>Módulos Contratados</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {modules.filter(m => m.is_active).map((module) => (
                  <label key={module.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                    <Checkbox
                      checked={selectedModules.includes(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                    <span className="text-sm">{module.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Peso: {module.default_weight}
                    </span>
                  </label>
                ))}
              </div>
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
