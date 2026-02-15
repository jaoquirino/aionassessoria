import { useState, useRef, useCallback } from "react";
import { MoreVertical, Pencil, Trash2, Plus, Pipette } from "lucide-react";
import { HexColorPicker } from "react-colorful";
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
import { cn } from "@/lib/utils";
import type { KanbanColumn } from "@/hooks/useKanbanColumns";

interface KanbanColumnMenuProps {
  column: KanbanColumn;
  onEdit: (id: string, label: string, colorClass: string) => void;
  onDelete: (id: string) => void;
  onAddAfter: (afterIndex: number) => void;
}

const presetColors = [
  { value: "bg-gray-400/20 border-gray-400/50", label: "Cinza", hex: "#9CA3AF" },
  { value: "bg-blue-500/20 border-blue-500/50", label: "Azul", hex: "#3B82F6" },
  { value: "bg-emerald-500/20 border-emerald-500/50", label: "Verde", hex: "#10B981" },
  { value: "bg-amber-500/20 border-amber-500/50", label: "Amarelo", hex: "#F59E0B" },
  { value: "bg-cyan-500/20 border-cyan-500/50", label: "Ciano", hex: "#06B6D4" },
  { value: "bg-red-500/20 border-red-500/50", label: "Vermelho", hex: "#EF4444" },
  { value: "bg-purple-500/20 border-purple-500/50", label: "Roxo", hex: "#A855F7" },
  { value: "bg-orange-500/20 border-orange-500/50", label: "Laranja", hex: "#F97316" },
  { value: "bg-pink-500/20 border-pink-500/50", label: "Rosa", hex: "#EC4899" },
  { value: "bg-lime-500/20 border-lime-500/50", label: "Lima", hex: "#84CC16" },
];

function isCustomHex(colorClass: string) {
  return colorClass.startsWith("custom:");
}

function getHexFromColor(colorClass: string): string {
  if (isCustomHex(colorClass)) return colorClass.replace("custom:", "");
  const preset = presetColors.find(p => p.value === colorClass);
  return preset?.hex || "#3B82F6";
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(getHexFromColor(value));
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = useCallback((newHex: string) => {
    setHex(newHex);
    onChange(`custom:${newHex}`);
  }, [onChange]);

  const handleHexInput = (input: string) => {
    setHex(input);
    if (/^#[0-9A-Fa-f]{6}$/.test(input)) {
      onChange(`custom:${input}`);
    }
  };

  const handlePresetClick = (preset: typeof presetColors[0]) => {
    setHex(preset.hex);
    onChange(preset.value);
  };

  return (
    <div className="space-y-3">
      {/* Gradient color picker */}
      <HexColorPicker color={hex} onChange={handleColorChange} style={{ width: "100%" }} />

      {/* Preset swatches */}
      <div className="grid grid-cols-5 gap-2">
        {presetColors.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "w-full aspect-square rounded-lg border-2 transition-all hover:scale-110",
              value === preset.value
                ? "border-foreground ring-2 ring-foreground/20"
                : "border-transparent"
            )}
            style={{ backgroundColor: preset.hex }}
            title={preset.label}
          />
        ))}
      </div>

      {/* HEX input + eyedropper */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-border shrink-0"
          style={{ backgroundColor: hex }}
        />
        <div className="relative flex-1">
          <Input
            value={hex}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#FFFFFF"
            className="font-mono text-sm pl-3 pr-10"
            maxLength={7}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
            onClick={() => nativeInputRef.current?.click()}
            title="Selecionar cor"
          >
            <Pipette className="h-4 w-4 text-muted-foreground" />
          </button>
          <input
            ref={nativeInputRef}
            type="color"
            value={hex}
            onChange={(e) => handleColorChange(e.target.value)}
            className="sr-only"
          />
        </div>
      </div>
    </div>
  );
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
  const [colorClass, setColorClass] = useState(column.color_class);

  const handleEdit = () => {
    onEdit(column.id, label, colorClass);
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
  const [colorClass, setColorClass] = useState("bg-gray-400/20 border-gray-400/50");

  const handleAdd = () => {
    if (label.trim()) {
      onAdd(label.trim(), colorClass);
      setLabel("");
      setColorClass("bg-gray-400/20 border-gray-400/50");
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
