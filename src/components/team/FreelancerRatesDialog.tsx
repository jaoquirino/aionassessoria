import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Trash2, Plus } from "lucide-react";
import { useFreelancerRates, useUpsertFreelancerRate, useDeleteFreelancerRate } from "@/hooks/useFreelancerRates";
import { useAllModules } from "@/hooks/useModules";
import type { TeamMember } from "@/hooks/useTeamMembers";

// Common deliverable types as suggestions, but user can type custom ones
const COMMON_DELIVERABLE_TYPES = ["Arte", "Vídeo", "Carrossel", "Fotografia", "Reels", "Stories", "Post"];

interface FreelancerRatesDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FreelancerRatesDialog({ member, open, onOpenChange }: FreelancerRatesDialogProps) {
  const [newModuleId, setNewModuleId] = useState("");
  const [newDeliverableType, setNewDeliverableType] = useState("");
  const [customType, setCustomType] = useState("");
  const [newRate, setNewRate] = useState(0);

  const { data: rates = [], isLoading } = useFreelancerRates(member?.id);
  const { data: modules = [] } = useAllModules();
  const upsertRate = useUpsertFreelancerRate();
  const deleteRate = useDeleteFreelancerRate();

  const activeModules = modules.filter(m => m.is_active);

  // Gather existing deliverable types from current rates to suggest them
  const existingTypes = useMemo(() => {
    const types = new Set<string>();
    COMMON_DELIVERABLE_TYPES.forEach(t => types.add(t));
    rates.forEach(r => {
      if (r.deliverable_type) types.add(r.deliverable_type);
    });
    return Array.from(types).sort();
  }, [rates]);

  useEffect(() => {
    if (open) {
      setNewModuleId("");
      setNewDeliverableType("");
      setCustomType("");
      setNewRate(0);
    }
  }, [open]);

  const handleAdd = async () => {
    if (!member || !newModuleId || newRate <= 0) return;
    const deliverableType = newDeliverableType === "__custom" ? customType.trim() : (newDeliverableType || null);
    await upsertRate.mutateAsync({
      team_member_id: member.id,
      module_id: newModuleId,
      deliverable_type: deliverableType || null,
      rate_per_unit: newRate,
    });
    setNewModuleId("");
    setNewDeliverableType("");
    setCustomType("");
    setNewRate(0);
  };

  const handleDelete = async (rateId: string) => {
    if (!member) return;
    await deleteRate.mutateAsync({ id: rateId, teamMemberId: member.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Valores por Produção — {member?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing rates */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : rates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum valor configurado. Adicione abaixo.
            </p>
          ) : (
            <div className="space-y-2">
              {rates.map((rate) => (
                <div key={rate.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rate.module?.name || "Módulo"}</p>
                    {rate.deliverable_type && (
                      <Badge variant="outline" className="text-xs mt-0.5">{rate.deliverable_type}</Badge>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">
                    R$ {Number(rate.rate_per_unit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleDelete(rate.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new rate */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Adicionar valor</p>

            <div className="space-y-2">
              <Label>Módulo *</Label>
              <Select value={newModuleId} onValueChange={setNewModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  {activeModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de entrega (opcional)</Label>
              <Select value={newDeliverableType} onValueChange={setNewDeliverableType}>
                <SelectTrigger>
                  <SelectValue placeholder="Módulo inteiro (qualquer tipo)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Módulo inteiro</SelectItem>
                  {existingTypes.map((dt) => (
                    <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                  ))}
                  <SelectItem value="__custom">Outro (digitar)</SelectItem>
                </SelectContent>
              </Select>
              {newDeliverableType === "__custom" && (
                <Input
                  placeholder="Digite o tipo de entrega"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor por peça *</Label>
              <CurrencyInput value={newRate} onChange={setNewRate} />
            </div>

            <Button
              onClick={handleAdd}
              disabled={!newModuleId || newRate <= 0 || upsertRate.isPending || (newDeliverableType === "__custom" && !customType.trim())}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
