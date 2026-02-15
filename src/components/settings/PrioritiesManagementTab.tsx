import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePriorities,
  useCreatePriority,
  useUpdatePriority,
  useDeletePriority,
  type Priority,
} from "@/hooks/usePriorities";

// ColorPickerField removed - using shared ColorPicker from ui/color-picker
export function PrioritiesManagementTab() {
  const { data: priorities = [], isLoading } = usePriorities();
  const createPriority = useCreatePriority();
  const updatePriority = useUpdatePriority();
  const deletePriority = useDeletePriority();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [formKey, setFormKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formColor, setFormColor] = useState("#3B82F6");
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setIsNew(true);
    setEditingPriority(null);
    setFormKey("");
    setFormLabel("");
    setFormColor("#3B82F6");
    setEditOpen(true);
  };

  const openEdit = (p: Priority) => {
    setIsNew(false);
    setEditingPriority(p);
    setFormKey(p.key);
    setFormLabel(p.label);
    setFormColor(p.color);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!formKey.trim() || !formLabel.trim()) return;

    if (isNew) {
      createPriority.mutate({
        key: formKey.trim().toLowerCase().replace(/\s+/g, "_"),
        label: formLabel.trim(),
        color: formColor,
        order_index: priorities.length + 1,
      });
    } else if (editingPriority) {
      updatePriority.mutate({
        id: editingPriority.id,
        label: formLabel.trim(),
        color: formColor,
      });
    }
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (editingPriority) {
      deletePriority.mutate(editingPriority.id);
    }
    setDeleteOpen(false);
    setEditingPriority(null);
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">Prioridades</h4>
          <p className="text-sm text-muted-foreground">
            Gerencie as prioridades das tarefas
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      </div>
      <Separator />

      <div className="space-y-2">
        {priorities.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full border border-border"
                style={{ backgroundColor: p.color }}
              />
              <Badge
                className="text-xs"
                style={{
                  backgroundColor: `${p.color}40`,
                  color: p.color,
                  borderColor: `${p.color}60`,
                }}
              >
                {p.label}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{p.key}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEdit(p)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => {
                  setEditingPriority(p);
                  setDeleteOpen(true);
                }}
                disabled={p.is_default}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nova Prioridade" : "Editar Prioridade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isNew && (
              <div className="space-y-2">
                <Label>Chave (identificador único)</Label>
                <Input
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="ex: critical"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="ex: Crítica"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="mt-1">
                <Badge
                  style={{
                    backgroundColor: `${formColor}40`,
                    color: formColor,
                    borderColor: `${formColor}60`,
                  }}
                >
                  {formLabel || "Preview"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formLabel.trim() || (isNew && !formKey.trim())}>
              {isNew ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover prioridade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tarefas com essa prioridade serão mantidas, mas a prioridade não aparecerá mais como opção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
