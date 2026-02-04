import { useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  onSave: () => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  className?: string;
  /** If true, auto-save when clicking outside (default: true) */
  autoSaveOnOutsideClick?: boolean;
}

/**
 * Unified Edit Dialog component following the system pattern:
 * - Opens as a centered modal (no page redirect)
 * - Has Title, editable fields, Save and Cancel buttons
 * - Save: saves changes, closes dialog, refreshes data
 * - Cancel: closes dialog, discards changes
 * - Clicking outside: closes and SAVES automatically (for fast operation)
 */
export function EditDialog({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  onCancel,
  isSaving = false,
  saveLabel = "Salvar",
  cancelLabel = "Cancelar",
  className,
  autoSaveOnOutsideClick = true,
}: EditDialogProps) {
  const hasChangesRef = useRef(false);
  const isClosingRef = useRef(false);

  // Track if user has interacted with the form
  const markAsChanged = useCallback(() => {
    hasChangesRef.current = true;
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      hasChangesRef.current = false;
      isClosingRef.current = false;
    }
  }, [open]);

  const handleSave = async () => {
    isClosingRef.current = true;
    await onSave();
    onOpenChange(false);
  };

  const handleCancel = () => {
    isClosingRef.current = true;
    hasChangesRef.current = false;
    onCancel?.();
    onOpenChange(false);
  };

  // Handle outside click - auto-save if enabled
  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && !isClosingRef.current) {
      // User clicked outside or pressed Escape
      if (autoSaveOnOutsideClick && hasChangesRef.current) {
        isClosingRef.current = true;
        await onSave();
      }
    }
    if (!newOpen) {
      isClosingRef.current = false;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={cn("max-w-lg flex flex-col max-h-[90vh]", className)}
        onInteractOutside={(e) => {
          // Prevent default close behavior, we handle it in onOpenChange
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div 
            className="py-4 space-y-4"
            onChange={() => markAsChanged()}
            onInput={() => markAsChanged()}
          >
            {children}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use with EditDialog for form state management
export function useEditDialog<T extends Record<string, any>>(
  initialData: T | null,
  onSaveCallback: (data: T) => Promise<void>
) {
  const dataRef = useRef<T | null>(null);

  useEffect(() => {
    if (initialData) {
      dataRef.current = { ...initialData };
    }
  }, [initialData]);

  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    if (dataRef.current) {
      dataRef.current[field] = value;
    }
  };

  const getData = () => dataRef.current;

  const save = async () => {
    if (dataRef.current) {
      await onSaveCallback(dataRef.current);
    }
  };

  return { updateField, getData, save };
}
