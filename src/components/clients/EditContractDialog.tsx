import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useUpdateContract, type ContractWithModules } from "@/hooks/useContracts";
import { CurrencyInput } from "@/components/ui/currency-input";

interface EditContractDialogProps {
  contract: ContractWithModules | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: "active", label: "Ativo" },
  { value: "ended", label: "Encerrado" },
];

export function EditContractDialog({
  contract,
  open,
  onOpenChange,
}: EditContractDialogProps) {
  const [monthlyValue, setMonthlyValue] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [minimumDuration, setMinimumDuration] = useState(12);
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  const updateContract = useUpdateContract();

  useEffect(() => {
    if (contract) {
      setMonthlyValue(contract.monthly_value);
      setStartDate(format(new Date(contract.start_date), "yyyy-MM-dd"));
      setRenewalDate(contract.renewal_date ? format(new Date(contract.renewal_date), "yyyy-MM-dd") : "");
      setMinimumDuration(contract.minimum_duration_months);
      setStatus(contract.status);
      setNotes(contract.notes || "");
    }
  }, [contract]);

  const handleSave = async () => {
    if (!contract) return;

    await updateContract.mutateAsync({
      id: contract.id,
      monthly_value: monthlyValue,
      start_date: startDate,
      renewal_date: renewalDate || null,
      minimum_duration_months: minimumDuration,
      status,
      notes: notes || null,
    });

    onOpenChange(false);
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
          <Button onClick={handleSave} disabled={updateContract.isPending}>
            {updateContract.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
