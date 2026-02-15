import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useSavedColors,
  useAddSavedColor,
  useUpdateSavedColor,
  useDeleteSavedColor,
  type SavedColor,
} from "@/hooks/useSavedColors";

export function SavedColorsManagementTab() {
  const { data: colors = [], isLoading } = useSavedColors();
  const addColor = useAddSavedColor();
  const updateColor = useUpdateSavedColor();
  const deleteColor = useDeleteSavedColor();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<SavedColor | null>(null);
  const [formHex, setFormHex] = useState("#3B82F6");
  const [formLabel, setFormLabel] = useState("");
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setIsNew(true);
    setEditingColor(null);
    setFormHex("#3B82F6");
    setFormLabel("");
    setEditOpen(true);
  };

  const openEdit = (c: SavedColor) => {
    setIsNew(false);
    setEditingColor(c);
    setFormHex(c.hex);
    setFormLabel(c.label || "");
    setEditOpen(true);
  };

  const handleSave = () => {
    if (isNew) {
      addColor.mutate({ hex: formHex, label: formLabel.trim() || undefined, order_index: colors.length + 1 });
    } else if (editingColor) {
      updateColor.mutate({ id: editingColor.id, hex: formHex, label: formLabel.trim() || undefined });
    }
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (editingColor) {
      deleteColor.mutate(editingColor.id);
    }
    setDeleteOpen(false);
    setEditingColor(null);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">Paleta de Cores</h4>
          <p className="text-sm text-muted-foreground">
            Cores salvas que aparecem em todos os seletores de cor
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      </div>
      <Separator />

      <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
        {colors.map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-1 group relative">
            <button
              type="button"
              onClick={() => openEdit(c)}
              className="w-10 h-10 rounded-lg border-2 border-border hover:scale-110 transition-all relative"
              style={{ backgroundColor: c.hex }}
              title={c.label || c.hex}
            >
              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-3.5 w-3.5 text-white drop-shadow-md" />
              </span>
            </button>
            <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
              {c.label || c.hex}
            </span>
          </div>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nova Cor" : "Editar Cor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome (opcional)</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="ex: Azul marca"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <ColorPicker value={formHex} onChange={setFormHex} />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            {!isNew && editingColor && (
              <Button
                variant="destructive"
                size="sm"
                className="mr-auto gap-1"
                onClick={() => {
                  setEditOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{isNew ? "Criar" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cor da paleta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta cor será removida de todos os seletores de cor.
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
