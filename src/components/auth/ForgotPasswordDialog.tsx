import { forwardRef } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordDialog = forwardRef<HTMLDivElement, ForgotPasswordDialogProps>(
  function ForgotPasswordDialog({ open, onOpenChange }, ref) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <Info className="h-12 w-12 text-primary mx-auto mb-4" />
            <DialogHeader>
              <DialogTitle className="text-center">Esqueceu sua senha?</DialogTitle>
              <DialogDescription className="text-center">
                Entre em contato com um administrador do sistema para redefinir sua senha.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => onOpenChange(false)} className="mt-6">
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

ForgotPasswordDialog.displayName = "ForgotPasswordDialog";
