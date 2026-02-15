import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ColorPicker } from "@/components/ui/color-picker";

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function getColorName(hex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return "";
  const [h, s, l] = hexToHsl(hex);
  if (l < 10) return "Preto";
  if (l > 95) return "Branco";
  if (s < 10) return "Cinza";
  if (h < 15) return "Vermelho";
  if (h < 40) return "Laranja";
  if (h < 65) return "Amarelo";
  if (h < 80) return "Lima";
  if (h < 160) return "Verde";
  if (h < 190) return "Ciano";
  if (h < 250) return "Azul";
  if (h < 290) return "Roxo";
  if (h < 330) return "Rosa";
  return "Vermelho";
}
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
  const [isNew, setIsNew] = useState(false);

  const handleFormHexChange = (newHex: string) => {
    setFormHex(newHex);
  };

  const openNew = () => {
    setIsNew(true);
    setEditingColor(null);
    setFormHex("#3B82F6");
    setEditOpen(true);
  };

  const openEdit = (c: SavedColor) => {
    setIsNew(false);
    setEditingColor(c);
    setFormHex(c.hex);
    setEditOpen(true);
  };

  const handleSave = () => {
    const label = getColorName(formHex);
    if (isNew) {
      addColor.mutate({ hex: formHex, label, order_index: colors.length + 1 });
    } else if (editingColor) {
      updateColor.mutate({ id: editingColor.id, hex: formHex, label });
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
              <Label>Cor</Label>
              <ColorPicker value={formHex} onChange={handleFormHexChange} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: formHex }} />
              <span className="text-sm font-medium text-foreground">{getColorName(formHex)}</span>
              <span className="text-xs text-muted-foreground font-mono">{formHex}</span>
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
