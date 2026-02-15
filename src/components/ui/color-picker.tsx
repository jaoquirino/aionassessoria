import { useState, useRef, useCallback } from "react";
import { Pipette, Plus, X } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSavedColors, useAddSavedColor, useUpdateSavedColor, useDeleteSavedColor } from "@/hooks/useSavedColors";

interface ColorPickerProps {
  value: string; // hex like "#3B82F6"
  onChange: (hex: string) => void;
  /** If true, show add/edit/remove controls on saved swatches */
  showPaletteManagement?: boolean;
}

export function ColorPicker({ value, onChange, showPaletteManagement = false }: ColorPickerProps) {
  const [hex, setHex] = useState(value);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const { data: savedColors = [] } = useSavedColors();
  const addColor = useAddSavedColor();
  const updateColor = useUpdateSavedColor();
  const deleteColor = useDeleteSavedColor();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleColorChange = useCallback((newHex: string) => {
    setHex(newHex);
    onChange(newHex);
  }, [onChange]);

  const handleHexInput = (input: string) => {
    setHex(input);
    if (/^#[0-9A-Fa-f]{6}$/.test(input)) {
      onChange(input);
    }
  };

  const handleSwatchClick = (swatchHex: string, id: string) => {
    if (editingId === id) {
      // Apply current picker color to this swatch
      updateColor.mutate({ id, hex });
      setEditingId(null);
    } else {
      setHex(swatchHex);
      onChange(swatchHex);
    }
  };

  const handleAddToSaved = () => {
    addColor.mutate({ hex, order_index: savedColors.length + 1 });
  };

  return (
    <div className="space-y-3">
      <HexColorPicker color={hex} onChange={handleColorChange} style={{ width: "100%", height: 160 }} />

      {/* Saved palette swatches */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Paleta salva</span>
          {showPaletteManagement && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 px-2"
              onClick={handleAddToSaved}
              title="Salvar cor atual na paleta"
            >
              <Plus className="h-3 w-3" />
              Salvar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {savedColors.map((sc) => (
            <div key={sc.id} className="relative group">
              <button
                type="button"
                onClick={() => handleSwatchClick(sc.hex, sc.id)}
                className={cn(
                  "w-full aspect-square rounded-lg border-2 transition-all hover:scale-110",
                  hex.toLowerCase() === sc.hex.toLowerCase()
                    ? "border-foreground ring-2 ring-foreground/20"
                    : "border-transparent"
                )}
                style={{ backgroundColor: sc.hex }}
                title={sc.label || sc.hex}
              />
              {showPaletteManagement && (
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground items-center justify-center text-[10px] hidden group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteColor.mutate(sc.id);
                  }}
                  title="Remover da paleta"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
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
