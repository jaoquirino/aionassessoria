import { useState } from "react";
import { Plus, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateClient } from "@/hooks/useClients";
import { clientSchema } from "@/lib/validationSchemas";
import { toast } from "sonner";

interface AddClientDialogProps {
  onClientAdded?: () => void;
  onClientCreatedForOnboarding?: (clientId: string) => void;
}

export function AddClientDialog({ onClientAdded, onClientCreatedForOnboarding }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  
  const createClient = useCreateClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (createClient.isPending) return;
    
    // Validate input
    const validation = clientSchema.safeParse({ 
      name, 
      status: "active"  // Create as active - will change to onboarding only if onboarding is generated
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Dados inválidos");
      return;
    }

    createClient.mutate(
      {
        name: validation.data.name,
        status: "active",  // Start as active, ContractDialog will set to onboarding if needed
      },
      {
        onSuccess: (data) => {
          setOpen(false);
          setName("");
          onClientAdded?.();

          // Always open contract dialog after creating client
          if (data && onClientCreatedForOnboarding) {
            onClientCreatedForOnboarding(data.id);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Novo Cliente
            </DialogTitle>
            <DialogDescription>
              Adicione um novo cliente à sua base. Você pode iniciar o processo de onboarding imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cliente</Label>
              <Input
                id="name"
                placeholder="Ex: Empresa XYZ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                autoFocus
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Após criar o cliente, você poderá configurar o contrato e os módulos de onboarding.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createClient.isPending} className="gap-2">
              {createClient.isPending ? (
                "Criando..."
              ) : (
                <>
                  Criar Cliente
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
