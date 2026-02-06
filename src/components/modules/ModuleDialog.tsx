import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateModule, useUpdateModule, type ServiceModule } from "@/hooks/useModules";

interface ModuleDialogProps {
  module?: ServiceModule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions = [
  "Designer",
  "Gestor de Tráfego",
  "Copywriter",
  "Comercial",
  "Atendimento",
  "Desenvolvedor",
];

export function ModuleDialog({ module, open, onOpenChange }: ModuleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultWeight, setDefaultWeight] = useState(2);
  const [isRecurring, setIsRecurring] = useState(true);
  const [primaryRole, setPrimaryRole] = useState("Designer");
  const [deliverableLimit, setDeliverableLimit] = useState<number | null>(null);

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();

  const isEditing = !!module;

  useEffect(() => {
    if (module) {
      setName(module.name);
      setDescription(module.description || "");
      setDefaultWeight(module.default_weight);
      setIsRecurring(module.is_recurring);
      setPrimaryRole(module.primary_role);
      setDeliverableLimit(module.deliverable_limit);
    } else {
      setName("");
      setDescription("");
      setDefaultWeight(2);
      setIsRecurring(true);
      setPrimaryRole("Designer");
      setDeliverableLimit(null);
    }
  }, [module, open]);

  const handleSave = async () => {
    if (!name.trim() || !primaryRole) return;

    try {
      if (isEditing && module) {
        await updateModule.mutateAsync({
          id: module.id,
          name: name.trim(),
          description: description.trim() || null,
          default_weight: defaultWeight,
          is_recurring: isRecurring,
          primary_role: primaryRole,
          deliverable_limit: deliverableLimit,
        });
      } else {
        await createModule.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          default_weight: defaultWeight,
          is_recurring: isRecurring,
          primary_role: primaryRole,
          deliverable_limit: deliverableLimit,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSaving = createModule.isPending || updateModule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do módulo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do serviço..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Peso Padrão</Label>
            <Input
              id="weight"
              type="number"
              min={1}
              max={10}
              value={defaultWeight}
              onChange={(e) => setDefaultWeight(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Peso operacional base para tarefas deste módulo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função Principal *</Label>
            <Select value={primaryRole} onValueChange={setPrimaryRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Recorrente</p>
              <p className="text-sm text-muted-foreground">
                Este módulo gera entregas mensais
              </p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
