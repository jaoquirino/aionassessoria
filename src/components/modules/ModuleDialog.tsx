import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateModule, useUpdateModule, type ServiceModule } from "@/hooks/useModules";
import { useRoleNames } from "@/hooks/useAvailableRoles";
import {
  useModuleDeliverableTypes,
  useAddModuleDeliverableType,
  useDeleteModuleDeliverableType,
} from "@/hooks/useModuleDeliverableTypes";

interface ModuleDialogProps {
  module?: ServiceModule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleDialog({ module, open, onOpenChange }: ModuleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultWeight, setDefaultWeight] = useState(2);
  const [isRecurring, setIsRecurring] = useState(true);
  const [primaryRole, setPrimaryRole] = useState("Designer");
  const [deliverableLimit, setDeliverableLimit] = useState<number | null>(null);
  const [newSubService, setNewSubService] = useState("");

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const roleOptions = useRoleNames();

  const isEditing = !!module;

  const { data: subServices = [] } = useModuleDeliverableTypes(module?.id);
  const addSubService = useAddModuleDeliverableType();
  const deleteSubService = useDeleteModuleDeliverableType();

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
    setNewSubService("");
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

  const handleAddSubService = async () => {
    if (!newSubService.trim() || !module?.id) return;
    await addSubService.mutateAsync({ moduleId: module.id, name: newSubService.trim() });
    setNewSubService("");
  };

  const isSaving = createModule.isPending || updateModule.isPending;

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === "textarea") return;
      e.preventDefault();
      if (!isEditing) {
        handleSave();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onKeyDown={handleDialogKeyDown}>
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


          {/* Sub-services / Deliverable Types - only when editing */}
          {isEditing && module && (
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">Tipos de Entrega</p>
                <p className="text-xs text-muted-foreground">
                  Subserviços que este módulo produz (ex: Arte, Vídeo, Carrossel)
                </p>
              </div>

              {subServices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {subServices.map((sub) => (
                    <Badge key={sub.id} variant="secondary" className="gap-1 pr-1">
                      {sub.name}
                      <button
                        onClick={() => deleteSubService.mutate(sub.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newSubService}
                  onChange={(e) => setNewSubService(e.target.value)}
                  placeholder="Ex: Arte, Vídeo..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddSubService();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddSubService}
                  disabled={!newSubService.trim() || addSubService.isPending}
                  className="h-8 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
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
