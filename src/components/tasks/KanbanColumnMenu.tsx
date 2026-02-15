import { useState } from "react";
import { MoreVertical, Pencil, Trash2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import type { KanbanColumn } from "@/hooks/useKanbanColumns";

interface KanbanColumnMenuProps {
  column: KanbanColumn;
  onEdit: (id: string, label: string, colorClass: string) => void;
  onDelete: (id: string) => void;
  onAddAfter: (afterIndex: number) => void;
}

function isCustomHex(colorClass: string) {
  return colorClass.startsWith("custom:");
}

function getHexFromColor(colorClass: string): string {
  if (isCustomHex(colorClass)) return colorClass.replace("custom:", "");
  // Legacy preset mapping
  const presetMap: Record<string, string> = {
    "bg-gray-400/20 border-gray-400/50": "#9CA3AF",
    "bg-blue-500/20 border-blue-500/50": "#3B82F6",
    "bg-emerald-500/20 border-emerald-500/50": "#10B981",
    "bg-amber-500/20 border-amber-500/50": "#F59E0B",
    "bg-cyan-500/20 border-cyan-500/50": "#06B6D4",
    "bg-red-500/20 border-red-500/50": "#EF4444",
    "bg-purple-500/20 border-purple-500/50": "#A855F7",
    "bg-orange-500/20 border-orange-500/50": "#F97316",
    "bg-pink-500/20 border-pink-500/50": "#EC4899",
    "bg-lime-500/20 border-lime-500/50": "#84CC16",
  };
  return presetMap[colorClass] || "#3B82F6";
}

/** Helper to get inline style for custom hex colors on column headers */
export function getColumnColorStyle(colorClass: string): React.CSSProperties | undefined {
  if (isCustomHex(colorClass)) {
    const hex = colorClass.replace("custom:", "");
    return {
      backgroundColor: `${hex}20`,
      borderColor: `${hex}80`,
    };
  }
  return undefined;
}

/** Get the tailwind class only if it's NOT a custom hex */
export function getColumnColorClass(colorClass: string): string {
  if (isCustomHex(colorClass)) return "";
  return colorClass;
}

export function KanbanColumnMenu({ column, onEdit, onDelete, onAddAfter }: KanbanColumnMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [label, setLabel] = useState(column.label);
  const [colorClass, setColorClass] = useState(getHexFromColor(column.color_class));

  const handleEdit = () => {
    onEdit(column.id, label, `custom:${colorClass}`);
    setEditOpen(false);
  };

  const handleDelete = () => {
    onDelete(column.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/50 transition-colors">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar coluna
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddAfter(column.order_index)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar coluna após
          </DropdownMenuItem>
          {!column.is_protected && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover coluna
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da coluna</Label>
              <Input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                placeholder="Nome da coluna"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <ColorPicker value={colorClass} onChange={setColorClass} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover coluna?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As tarefas nesta coluna serão movidas para "A fazer".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Dialog for adding new column
interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (label: string, colorClass: string) => void;
}

export function AddColumnDialog({ open, onOpenChange, onAdd }: AddColumnDialogProps) {
  const [label, setLabel] = useState("");
  const [colorClass, setColorClass] = useState("#9CA3AF");

  const handleAdd = () => {
    if (label.trim()) {
      onAdd(label.trim(), `custom:${colorClass}`);
      setLabel("");
      setColorClass("#9CA3AF");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nova Coluna</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da coluna</Label>
            <Input 
              value={label} 
              onChange={(e) => setLabel(e.target.value)} 
              placeholder="Ex: Em aprovação"
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorPicker value={colorClass} onChange={setColorClass} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={!label.trim()}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
