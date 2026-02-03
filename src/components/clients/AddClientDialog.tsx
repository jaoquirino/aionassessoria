import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddClientDialogProps {
  onClientAdded?: () => void;
}

export function AddClientDialog({ onClientAdded }: AddClientDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startOnboarding, setStartOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Digite o nome do cliente");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: name.trim(),
          status: startOnboarding ? "onboarding" : "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Cliente "${name}" criado com sucesso!`);
      setOpen(false);
      setName("");
      onClientAdded?.();

      if (startOnboarding && data) {
        navigate(`/clientes/${data.id}/onboarding`);
      }
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error("Erro ao criar cliente: " + error.message);
    } finally {
      setIsLoading(false);
    }
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
                autoFocus
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
            >
              <div className="space-y-0.5">
                <Label htmlFor="onboarding" className="text-base font-medium">
                  Iniciar Onboarding
                </Label>
                <p className="text-sm text-muted-foreground">
                  Inicie o processo de integração do cliente
                </p>
              </div>
              <Switch
                id="onboarding"
                checked={startOnboarding}
                onCheckedChange={setStartOnboarding}
              />
            </motion.div>

            <AnimatePresence>
              {startOnboarding && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-primary/30 bg-primary/5 p-4"
                >
                  <p className="text-sm font-medium text-foreground mb-2">
                    Etapas do Onboarding:
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">1</span>
                      Coleta de acessos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">2</span>
                      Briefing inicial
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">3</span>
                      Definição de módulos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">4</span>
                      Reunião de kickoff
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                "Criando..."
              ) : startOnboarding ? (
                <>
                  Criar e Iniciar Onboarding
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                "Criar Cliente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
